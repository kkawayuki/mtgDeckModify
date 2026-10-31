// Test decks loaded into the Old and New boxes when ENV is 'development' (see config.js).
const SAMPLE_OLD = `1 Ardenn, Intrepid Archaeologist (CMR) 10
1 Kediss, Emberclaw Familiar (CMR) 188
1 Angelic Gift (BFZ) 19
1 Banishing Light (PLST) JOU-5
1 Blackblade Reforged (DOM) 211
1 Blacksmith's Talent (BLB) 125
1 Boros Guildgate (DDL) 33
1 Bulk Up (FDN) 80
1 Cathar Commando (MID) 10
1 Champion of the Flame (DOM) 116
1 Colossus Hammer (FIC) 338
1 Command Tower (SCD) 297
1 Crumb and Get It (BLB) 8
1 Dog Umbra (MH3) 22
1 Dreadmaw's Ire (LCI) 147
1 Etali's Favor (LCI) 149
1 Faithless Looting (LCC) 225
1 Fleetfeather Sandals (THS) 216
1 Fling (ELD) 126
1 Fountainport Bell (BLB) 245
1 Furycalm Snarl (SOC) 375
1 Galvanic Discharge (MH3) 122
1 Gods Willing (CN2) 88
1 Gorilla Shaman (PLST) MH2-280
1 Grab the Prize (DSK) 138
1 Holdout Settlement (OGW) 172
1 Hot Soup (M15) 219
1 Immolating Glare (OGW) 20
1 Inquisitor's Flail (ISD) 227
1 Jolted Awake (MH3) 33
1 Kellan, the Fae-Blooded / Birthright Boon (WOE) 230
1 Kíli the Resourceful (HOB) 17
1 Lifelink (M12) 24
1 Light-Paws, Emperor's Voice (NEO) 25
1 Lightning Bolt (SUM) 162
1 Lion Sash (NEO) 26
1 Lorehold Charm (SOS) 200
1 Monumental Henge (MH3) 222
10 Mountain (BRO) 274
1 Oblation (C21) 97
1 Open the Armory (SOI) 32
1 Ornithopter (DMR) 386
1 Petrify (LCI) 30
10 Plains (DDP) 36
1 Planar Disruption (PLST) ONE-28
1 Powerbalance (MH3) 495 *F*
1 Pursue the Past (SOS) 216
1 Razorgrass Ambush / Razorgrass Field (MH3) 238
1 Realmbreaker's Grasp (MOM) 33
1 Relic Seeker (ORI) 29
1 Reroute Systems (EOE) 31
1 Return Triumphant (WOE) 26
1 Ritual of Restoration (DST) 13
1 Rogue's Gloves (M19) 243
1 Rogue's Passage (UMA) 250
1 Saw (DSK) 254
1 Shardmage's Rescue (DSK) 29
1 Sheltered by Ghosts (DSK) 30
1 Sigil of Distinction (ALA) 219
1 Skrelv, Defector Mite (ONE) 301
1 Sol Ring (MSC) 211
1 Spectral Steel (J22) 247
1 Spirit Mantle (PLST) M12-35
1 Sram, Senior Edificer (SOC) 176
1 Steelshaper's Gift (MAR) 50
1 Sticky Fingers (PLST) SNC-124
1 Surge of Salvation (PLST) MOM-41
1 Swiftfoot Boots (FDC) 291
1 Swords to Plowshares (FRC) 37
1 Temple of Triumph (FDN) 705
1 Temur Battle Rage (CMM) 264
1 Thalia, Guardian of Thraben (VOW) 38
1 Thrill of Possibility (ELD) 146
1 Thunderous Might (BNG) 114
1 Tormenting Voice (SOI) 186
1 Trapped in the Screen (DSK) 36
1 Unquestioned Authority (CNS) 85
1 Vibranium Energy Daggers (MSH) 254
1 Vow of Duty (CNS) 87
1 Weapons Vendor (FIN) 40
1 Wind-Scarred Crag (CM2) 278
1 Witch's Mark (PLST) WOE-158`;

const SAMPLE_NEW = `1 Ardenn, Intrepid Archaeologist (CMR) 10
1 Rograkh, Son of Rohgahh (CMR) 197
1 Access Tunnel (PW26) 9
1 Akiri, Fearless Voyager (CMM) 335 *F*
1 Apostle's Blessing (NPH) 2
1 Archon of Emeria (MB2) 4
1 Argivian Find (PLST) WTH-6
1 Axgard Armory (KHM) 250
1 Battlefield Forge (EOC) 58
1 Blacksmith's Skill (MH2) 381
1 Blacksmith's Talent (BLB) 125
1 Blasphemous Act (FDC) 140
1 Bloodforged Battle-Axe (PIP) 226 *F*
1 Bonders' Enclave (FDC) 297
1 Bulk Up (SOA) 40
1 Celestial Armor (FDN) 5
1 Clifftop Retreat (BLC) 300
1 Colossus Hammer (FIC) 338
1 Command Tower (EOC) 59
1 Control of the Court (MB2) 189
1 Deafening Silence (MB2) 9
1 Divine Reckoning (C19) 62
1 Doc Ock's Tentacles (SPM) 162
1 Dragonfire Blade (PTDM) 240p *F*
1 Eidolon of Rhetoric (JOU) 10
1 Faithless Looting (LCC) 225
1 Fall of the First Civilization (ACR) 4
1 Feather of Flight (BLB) 13
1 Forging the Tyrite Sword (KHM) 211
1 Furycalm Snarl (SOC) 375
1 Goblin Lore (JMP) 328
1 Gods Willing (CN2) 88
1 Grasp of Fate (FDC) 32
1 Hardlight Containment (EOE) 20
1 Holdout Settlement (OGW) 172
1 Joined Researchers / Secret Rendezvous (SOS) 23
1 Jolted Awake (MH3) 33
1 Kellan, the Fae-Blooded / Birthright Boon (WOE) 230
1 Kíli the Resourceful (HOB) 17 *F*
1 Lorehold Charm (SOS) 200
1 Magus of the Moon (TSR) 175
1 Mana Tithe (PLC) 25
1 Masterwork of Ingenuity (PIP) 234
1 Mishra's Command (PBRO) 141p
1 Monumental Henge (MH3) 222
7 Mountain (TRK) 323
1 Open the Armory (SOI) 32
1 Origin of Thor (MSC) 701
1 Path to Exile (FIC) 248
10 Plains (TRK) 317
1 Puresteel Paladin (FIC) 250
1 Pursue the Past (SOS) 216
1 Razorgrass Ambush / Razorgrass Field (MH3) 238
1 Recommission (BRO) 22
1 Relic Seeker (PORI) 29s *F*
1 Reroute Systems (EOE) 31
1 Return Triumphant (WOE) 26
1 Ritual of Restoration (DST) 13
1 Roadside Reliquary (NEO) 272
1 Rugged Prairie (BLC) 327
1 Rule of Law (M20) 35
1 Sazacap's Brew (PLST) BLB-151
1 Sevinne's Reclamation (SOC) 170
1 Shardmage's Rescue (DSK) 29
1 Shelter (PLST) ODY-46
1 Sheltered by Ghosts (DSK) 30
1 Skeleton Key (SOI) 263
1 Sol Ring (MSC) 211
1 Spectral Steel (J22) 247
1 Spire of Industry (DRC) 172
1 Springleaf Drum (PLST) LRW-261
1 Sram, Senior Edificer (SOC) 176
1 Steelshaper's Gift (MAR) 50
1 Strength-Testing Hammer (UNF) 193
1 Sunscorched Divide (FIC) 433
1 Super-Soldier Serum (MSH) 38
1 Surge of Salvation (PLST) MOM-41
1 Survivors' Encampment (PLST) HOU-184
1 Swords to Plowshares (FRC) 37
1 Thalia, Guardian of Thraben (VOW) 38
1 Thrill of Possibility (ELD) 146
1 Vault 21: House Gambit (PIP) 69
1 Vryn Wingmare (PLST) M21-43
1 Weathered Wayfarer (LTC) 183
1 Winter Moon (MH3) 213
1 Witch's Mark (PLST) WOE-158
1 Wrecking Ball Arm (FIC) 100
1 Zephyr Boots (STX) 261`;
