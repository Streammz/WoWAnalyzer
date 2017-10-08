import SPELLS from 'common/SPELLS';
import { formatDuration } from 'common/format';

import Module from 'Parser/Core/Module';

import CastEfficiency from './CastEfficiency';

const debug = true;

function spellName(spellId) {
  return SPELLS[spellId] ? SPELLS[spellId].name : '???';
}

class SpellUsable extends Module {
  static dependencies = {
    castEfficiency: CastEfficiency,
  };
  _currentCooldowns = {};

  /**
   * Whether the spell can be cast. This is not the opposite of `isOnCooldown`! A spell with 2 charges, 1 available and 1 on cooldown would be both available and on cooldown at the same time.
   */
  isAvailable(spellId) {
    if (this.isOnCooldown(spellId)) {
      const maxCharges = this.castEfficiency.getMaxCharges(spellId);
      if (maxCharges > this._currentCooldowns[spellId].chargesOnCooldown) {
        return true;
      }
      return false;
    } else {
      return true;
    }
  }
  /**
   * Whether the spell is on cooldown. If a spell has multiple charges with 1 charge on cooldown and 1 available, this will return `true`. Use `isAvailable` if you just want to know if a spell is castable. Use this if you want to know if a spell is current cooling down, regardless of being able to cast it.
   */
  isOnCooldown(spellId) {
    return !!this._currentCooldowns[spellId];
  }
  /**
   * Returns the amount of time remaining on the cooldown.
   * @param {number} spellId
   * @param {number} timestamp Override the timestamp if it may be different from the current timestamp.
   * @returns {number|null} Returns null if the spell isn't on cooldown.
   */
  cooldownRemaining(spellId, timestamp = this.owner.currentTimestamp) {
    if (!this.isOnCooldown(spellId)) {
      return null;
    }
    const cooldown = this._currentCooldowns[spellId];
    const expectedEnd = cooldown.start + cooldown.expectedDuration;
    return expectedEnd - timestamp;
  }
  /**
   * Start the cooldown for the provided spell.
   * @param {number} spellId The ID of the spell.
   * @param {number|null} overrideDurationMs This allows you to override the duration of the cooldown. If this isn't provided, the cooldown is calculated like normal.
   * @param {number} timestamp Override the timestamp if it may be different from the current timestamp.
   */
  beginCooldown(spellId, overrideDurationMs = null, timestamp = this.owner.currentTimestamp) {
    const expectedCooldownDuration = overrideDurationMs || this.castEfficiency.getExpectedCooldownDuration(spellId);
    if (!expectedCooldownDuration) {
      debug && console.warn('Spell', spellName(spellId), spellId, 'doesn\'t have a cooldown.');
      return;
    }

    if (!this.isOnCooldown(spellId)) {
      this._currentCooldowns[spellId] = {
        start: timestamp,
        expectedDuration: expectedCooldownDuration,
        chargesOnCooldown: 1,
      };
      this._triggerEvent('updatespellusable', this._makeEvent(spellId, timestamp, 'begincooldown'));
    } else {
      if (this.isAvailable(spellId)) {
        // Another charge is available
        this._currentCooldowns[spellId].chargesOnCooldown += 1;
        this._triggerEvent('updatespellusable', this._makeEvent(spellId, timestamp, 'addcooldowncharge'));
      } else {
        console.error(
          formatDuration(this.owner.fightDuration / 1000),
          spellName(spellId), spellId, `was cast while already marked as on cooldown. It probably either has multiple charges, can be reset early, cooldown can be reduced, the configured CD is invalid, the Haste is too low, the combatlog records multiple casts per player cast (e.g. ticks of a channel) or this is a latency issue.`,
          'time passed:', (timestamp - this._currentCooldowns[spellId].start),
          'cooldown remaining:', this.cooldownRemaining(spellId, timestamp),
          'expectedDuration:', this._currentCooldowns[spellId].expectedDuration
        );
        this.endCooldown(spellId, false, timestamp);
        this.beginCooldown(spellId, overrideDurationMs, timestamp);
      }
    }
  }
  /**
   * Finishes the cooldown for the provided spell.
   * @param {number} spellId The ID of the spell.
   * @param {boolean} resetAllCharges Whether all charges should be reset or just the last stack. Does nothing for spells with just 1 stack.
   * @param {number} timestamp Override the timestamp if it may be different from the current timestamp.
   */
  endCooldown(spellId, resetAllCharges = false, timestamp = this.owner.currentTimestamp) {
    if (!this.isOnCooldown(spellId)) {
      throw new Error(`Tried to end the cooldown of ${spellId}, but it's not on cooldown.`);
    }

    const cooldown = this._currentCooldowns[spellId];
    if (cooldown.chargesOnCooldown === 1 || resetAllCharges) {
      delete this._currentCooldowns[spellId];
      this._triggerEvent('updatespellusable', this._makeEvent(spellId, timestamp, 'endcooldown', {
        ...cooldown,
        end: timestamp,
      }));
    } else {
      // We have another charge ready to go on cooldown, this simply adds a charge and then refreshes the cooldown (spells with charges don't cooldown simultaneously)
      cooldown.chargesOnCooldown -= 1;
      this._triggerEvent('updatespellusable', this._makeEvent(spellId, timestamp, 'restorecharge', cooldown));
      this.refreshCooldown(spellId, null, timestamp);
    }
  }
  /**
   * Refresh (restart) the cooldown for the provided spell.
   * @param {number} spellId The ID of the spell.
   * @param {number|null} overrideDurationMs This allows you to override the duration of the cooldown. If this isn't provided, the cooldown is calculated like normal.
   * @param {number} timestamp Override the timestamp if it may be different from the current timestamp.
    calculated like normal.
   */
  refreshCooldown(spellId, overrideDurationMs = null, timestamp = this.owner.currentTimestamp) {
    if (!this.isOnCooldown(spellId)) {
      throw new Error(`Tried to refresh the cooldown of ${spellId}, but it's not on cooldown.`);
    }
    const expectedCooldownDuration = overrideDurationMs || this.castEfficiency.getExpectedCooldownDuration(spellId);
    if (!expectedCooldownDuration) {
      debug && console.warn('Spell', spellName(spellId), spellId, 'doesn\'t have a cooldown.');
      return;
    }

    this._currentCooldowns[spellId].start = timestamp;
    this._currentCooldowns[spellId].expectedDuration = expectedCooldownDuration;
    this._triggerEvent('updatespellusable', this._makeEvent(spellId, timestamp, 'refreshcooldown'));
  }
  /**
   * Reduces the cooldown for the provided spell by the provided duration.
   * @param {number} spellId The ID of the spell.
   * @param {number} durationMs The duration to reduce the cooldown with, in milliseconds.
   * @param {number} timestamp Override the timestamp if it may be different from the current timestamp.
   * @returns {*}
   */
  reduceCooldown(spellId, durationMs, timestamp = this.owner.currentTimestamp) {
    if (!this.isOnCooldown(spellId)) {
      throw new Error(`Tried to reduce the cooldown of ${spellId}, but it's not on cooldown.`);
    }
    const cooldownRemaining = this.cooldownRemaining(spellId, timestamp);
    if (cooldownRemaining < durationMs) {
      this.endCooldown(spellId, false, timestamp);
      return cooldownRemaining;
    } else {
      this._currentCooldowns[spellId].expectedDuration -= durationMs;
      return durationMs;
    }
  }

  _makeEvent(spellId, timestamp, trigger, others = {}) {
    const cooldown = this._currentCooldowns[spellId];
    const chargesOnCooldown = cooldown ? cooldown.chargesOnCooldown : 0;
    const maxCharges = this.castEfficiency.getMaxCharges(spellId) || 1;
    return {
      spellId,
      trigger,
      timestamp,
      isOnCooldown: this.isOnCooldown(spellId),
      isAvailable: this.isAvailable(spellId),
      chargesAvailable: maxCharges - chargesOnCooldown,
      maxCharges,
      timePassed: cooldown ? timestamp - cooldown.start : undefined,
      sourceID: this.owner.playerId,
      targetID: this.owner.playerId,
      ...cooldown,
      ...others,
    };
  }
  _triggerEvent(eventType, event) {
    if (debug) {
      const spellId = event.spellId;
      const fightDuration = formatDuration((event.timestamp - this.owner.fight.start_time) / 1000);
      switch (eventType) {
        case 'begincooldown':
          console.log(fightDuration, 'Cooldown started:', spellName(spellId), spellId, `(charges on cooldown: ${this._currentCooldowns[spellId].chargesOnCooldown})`);
          break;
        case 'begincooldowncharge':
          console.log(fightDuration, 'Used another charge:', spellName(spellId), spellId, `(charges on cooldown: ${this._currentCooldowns[spellId].chargesOnCooldown})`);
          break;
        case 'refreshcooldown':
          console.log(fightDuration, 'Cooldown refreshed:', spellName(spellId), spellId);
          break;
        case 'restorecooldowncharge':
          console.log(fightDuration, 'Charge cooldown finished:', spellName(spellId), spellId, `(charges left on cooldown: ${this._currentCooldowns[spellId].chargesOnCooldown})`);
          break;
        case 'endcooldown':
          console.log(fightDuration, 'Cooldown finished:', spellName(spellId), spellId);
          break;
        default: break;
      }
    }

    this.owner.triggerEvent(eventType, event);
  }

  on_byPlayer_cast(event) {
    const spellId = event.ability.guid;
    this.beginCooldown(spellId, null, event.timestamp);
  }
  _checkCooldownExpiry(timestamp) {
    Object.keys(this._currentCooldowns).forEach(spellId => {
      const remainingDuration = this.cooldownRemaining(spellId, timestamp);
      if (remainingDuration <= 0) {
        const expectedEnd = this._currentCooldowns[spellId].start + this._currentCooldowns[spellId].expectedDuration;
        this.endCooldown(Number(spellId), false, expectedEnd);
      }
    });
  }
  _isCheckingCooldowns = false;
  on_event(_, event) {
    if (!this._isCheckingCooldowns) {
      // This ensures this method isn't called again before it's finished executing (_checkCooldowns might trigger events).
      this._isCheckingCooldowns = true;
      this._checkCooldownExpiry((event && event.timestamp) || this.owner.currentTimestamp);
      this._isCheckingCooldowns = false;
    }
  }
}

export default SpellUsable;
