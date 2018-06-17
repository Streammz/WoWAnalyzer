import React from 'react';

import Analyzer from 'Parser/Core/Analyzer';
import Combatants from 'Parser/Core/Modules/Combatants';
import ITEMS from 'common/ITEMS/OTHERS';
import SPELLS from 'common/SPELLS/OTHERS';
//NLC Tier 2 Traits
import ChaoticDarkness from 'Parser/Core/Modules/NetherlightCrucibleTraits/ChaoticDarkness';
import LightsEmbrace from 'Parser/Core/Modules/NetherlightCrucibleTraits/LightsEmbrace';
import InfusionOfLight from 'Parser/Core/Modules/NetherlightCrucibleTraits/InfusionOfLight';
import Shadowbind from 'Parser/Core/Modules/NetherlightCrucibleTraits/Shadowbind';
import TormentTheWeak from 'Parser/Core/Modules/NetherlightCrucibleTraits/TormentTheWeak';
import DarkSorrows from 'Parser/Core/Modules/NetherlightCrucibleTraits/DarkSorrows';
import MasterOfShadows from 'Parser/Core/Modules/NetherlightCrucibleTraits/MasterOfShadows';
import ItemDamageDone from 'Main/ItemDamageDone';
import ItemHealingDone from 'Main/ItemHealingDone';

/*
 * Insignia of the Grand Army
 * Equip: Increase the effects of Light and Shadow powers granted by the Netherlight Crucible by 50%.
*/

const MASTERY_AMOUNT = 500;
const AVOIDANCE_AMOUNT = 1000;

class InsigniaOfTheGrandArmy extends Analyzer {
  static dependencies = {
    combatants: Combatants,
    infusionOfLight: InfusionOfLight,
    lightsEmbrace: LightsEmbrace,
    shadowbind: Shadowbind,
    chaoticDarkness: ChaoticDarkness,
    tormentTheWeak: TormentTheWeak,
    darkSorrows: DarkSorrows,
    baseMasterOfShadows: MasterOfShadows,
  };

  // NO MEMES<
  damage = 0;
  healing = 0;
  refractiveHealing = 0;
  infusionOfLightDamage = 0;
  infusionOfLightHealing = 0;
  lightsEmbraceHealing = 0;
  shadowBindDamage = 0;
  shadowBindHealing = 0;
  chaoticDarknessDamage = 0;
  chaoticDarknessHealing = 0;
  tormentTheWeakDamage = 0;
  darkSorrowsDamage = 0;

  on_initialized() {
    this.active = Object.keys(this.constructor.dependencies)
      .map(key => this[key]).some(dependency => dependency.active) && this.combatants.selected.hasFinger(ITEMS.INSIGNIA_OF_THE_GRAND_ARMY.id);
  }

  on_byPlayer_damage(event) {
    const spellID = event.ability.guid;
    if (spellID === SPELLS.INFUSION_OF_LIGHT_DAMAGE.id) {
      this.damage += event.amount + (event.absorbed || 0);
      this.infusionOfLightDamage += event.amount + (event.absorbed || 0);
    }
    if (spellID === SPELLS.SHADOWBIND_DAMAGE_HEALING.id) {
      this.damage += event.amount + (event.absorbed || 0);
      this.shadowBindDamage += event.amount + (event.absorbed || 0);
    }
    if (spellID === SPELLS.CHAOTIC_DARKNESS_DAMAGE.id) {
      this.damage += (event.amount || 0) + (event.absorbed || 0) + (event.overkill || 0);
      this.chaoticDarknessDamage += (event.amount || 0) + (event.absorbed || 0) + (event.overkill || 0);
    }
    if (spellID === SPELLS.TORMENT_THE_WEAK_DAMAGE.id) {
      this.damage += event.amount + (event.absorbed || 0);
      this.tormentTheWeakDamage += event.amount + (event.absorbed || 0);
    }
    if (spellID === SPELLS.DARK_SORROWS_DAMAGE.id) {
      this.damage += event.amount + (event.absorbed || 0);
      this.darkSorrowsDamage += event.amount + (event.absorbed || 0);
    }

  }
  on_byPlayer_heal(event) {
    const spellId = event.ability.guid;
    if (spellId !== SPELLS.INFUSION_OF_LIGHT_HEALING.id && spellId !== SPELLS.LIGHTS_EMBRACE_HEALING.id && spellId !== SPELLS.CHAOTIC_DARKNESS_HEALING.id && spellId !== SPELLS.SHADOWBIND_DAMAGE_HEALING.id) {
      return;
    }
    if (spellId === SPELLS.INFUSION_OF_LIGHT_HEALING.id) {
      this.healing += (event.amount || 0) + (event.absorbed || 0);
      this.infusionOfLightHealing += (event.amount || 0) + (event.absorbed || 0);
    }
    if (spellId === SPELLS.LIGHTS_EMBRACE_HEALING.id) {
      this.healing += (event.amount || 0) + (event.absorbed || 0);
      this.lightsEmbraceHealing += (event.amount || 0) + (event.absorbed || 0);
    }
    if (spellId === SPELLS.SHADOWBIND_DAMAGE_HEALING.id) {
      this.healing += (event.amount || 0) + (event.absorbed || 0);
      this.shadowBindHealing += (event.amount || 0) + (event.absorbed || 0);
    }
    if (spellId === SPELLS.CHAOTIC_DARKNESS_HEALING.id) {
      this.healing += (event.amount || 0) + (event.absorbed || 0);
      this.chaoticDarknessHealing += (event.amount || 0) + (event.absorbed || 0);
    }

  }

  get masterOfShadowsMasteryIncrease() {
    return (MASTERY_AMOUNT * this.combatants.selected.traitsBySpellId[SPELLS.MASTER_OF_SHADOWS_TRAIT.id]) / 2;
  }

  get masterOfShadowsAvoidanceIncrease() {
    return (AVOIDANCE_AMOUNT * this.combatants.selected.traitsBySpellId[SPELLS.MASTER_OF_SHADOWS_TRAIT.id]) / 2;
  }

  item() {
    //Basics
    let tooltip = this.damage + this.healing > 0 ? `This list will show how much of your total NLC trait contribution, the insignia was responsible for: <ul>` : ``;
    tooltip += this.damage > 0 ? `<li>Damage: ${this.owner.formatItemDamageDone(this.damage / 3)}</li>` : ``;
    tooltip += this.healing > 0 ? `<li>Healing: ${this.owner.formatItemHealingDone(this.healing / 3)}</li>` : ``;
    tooltip += this.damage + this.healing > 0 ? `</ul>` : ``;
    //More in depth
    tooltip += `The following will be a breakdown of your individual NLC traits and how they were impacted by the legendary ring: <ul>`;
    //Murderous Intent
    tooltip += this.combatants.selected.traitsBySpellId[SPELLS.MURDEROUS_INTENT_TRAIT.id] > 0 ? `<li>Murderous Intent: <ul><li>${this.averageVersFromRing} average versatility </li></ul></li>` : ``;
    //MasterOfShadows
    tooltip += this.combatants.selected.traitsBySpellId[SPELLS.MASTER_OF_SHADOWS_TRAIT.id] > 0 ? `<li>Master Of Shadows: <ul><li>${this.masterOfShadowsMasteryIncrease} increased mastery </li><li>${this.masterOfShadowsAvoidanceIncrease} increased avoidance</li></ul></li>` : ``;
    //Infusion Of Light
    tooltip += this.combatants.selected.traitsBySpellId[SPELLS.INFUSION_OF_LIGHT_TRAIT.id] > 0 ? `<li>Infusion Of Light: <ul><li>${this.owner.formatItemDamageDone(this.infusionOfLightDamage / 3)}</li><li>${this.owner.formatItemHealingDone(this.infusionOfLightHealing / 3)}</li></ul></li>` : ``;
    //Lights Embrace
    tooltip += this.combatants.selected.traitsBySpellId[SPELLS.LIGHTS_EMBRACE_TRAIT.id] > 0 ? `<li>Light's Embrace:<ul><li>${this.owner.formatItemHealingDone(this.lightsEmbraceHealing / 3)}</li></ul></li>` : ``;
    //Shadowbind
    tooltip += this.combatants.selected.traitsBySpellId[SPELLS.SHADOWBIND_TRAIT.id] > 0 ? `<li>Shadowbind: <ul><li>${this.owner.formatItemDamageDone(this.shadowBindDamage / 3)}</li><li>${this.owner.formatItemHealingDone(this.shadowBindHealing / 3)}</li></ul></li>` : ``;
    //Chaotic Darkness
    tooltip += this.combatants.selected.traitsBySpellId[SPELLS.CHAOTIC_DARKNESS_TRAIT.id] > 0 ? `<li>Chaotic Darkness: <ul><li>${this.owner.formatItemDamageDone(this.chaoticDarknessDamage / 3)}</li><li>${this.owner.formatItemHealingDone(this.chaoticDarknessHealing / 3)}</li></ul></li>` : ``;
    //Torment The Weak
    tooltip += this.combatants.selected.traitsBySpellId[SPELLS.TORMENT_THE_WEAK_TRAIT.id] > 0 ? `<li>Torment The Weak: <ul><li>${this.owner.formatItemDamageDone(this.tormentTheWeakDamage / 3)}</li</ul></li>` : ``;
    //Dark Sorrows
    tooltip += this.combatants.selected.traitsBySpellId[SPELLS.DARK_SORROWS_TRAIT.id] > 0 ? `<li>Dark Sorrows: <ul><li>${this.owner.formatItemDamageDone(this.darkSorrowsDamage / 3)}</li</ul></li>` : ``;

    if (this.damage > 0 || this.healing > 0) {
      return {
        item: ITEMS.INSIGNIA_OF_THE_GRAND_ARMY,
        result: (
          <dfn data-tip={tooltip}>
            <ItemDamageDone amount={this.damage / 3} /><br />
            <ItemHealingDone amount={this.healing / 3} />
          </dfn>
        ),
      };
    } else {
      return {
        item: ITEMS.INSIGNIA_OF_THE_GRAND_ARMY,
        result: (
          <dfn data-tip={tooltip}>
            This buffed your Tier 2 NLC Traits by 50%, see more in the tooltip.
          </dfn>
        ),
      };
    }
  }
}

export default InsigniaOfTheGrandArmy;
