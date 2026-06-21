# French 2 ↔ French 1 Overlapping Words

_Generated 2026-06-21 from `French 2.iso` (`MDB/Exceltra French.mdb`) compared against the imported French 1 export (`DB IMPORT FRENCH/General.csv`), matched by legacy `RefN`._

## What this is

French 2's database re-bundles a block of rows under internal course codes (ICC) **`1`** and **`21`** — the same codes French 1 uses. These are **not new French 2 material**; they duplicate French 1 vocab (ICC 1) and two stray sentence rows (ICC 21). The French 2 import will **skip every row in this list** and import only the genuinely new ICC **`2`** (vocab), **`22`** (sentences) and **`12`** (proverbs) content.

## Summary

| Bucket | Count |
|---|---|
| ICC 1 — duplicates French 1 vocab | 143 |
| ICC 21 — stray/junk sentence rows | 2 |
| **Total overlap rows (all skipped)** | 145 |

| Match vs French 1 (by RefN) | Count |
|---|---|
| Identical raw text | 20 |
| Same word, cosmetic-only difference¹ | 106 |
| Foreign headword differs slightly² | 19 |
| RefN absent from French 1 | 0 |

¹ Cosmetic = comma-spacing in the foreign (`être ,v.` vs `être, v.`) and/or a trailing grammatical marker on French 1's English gloss (`birthday, n.` vs `birthday`). The French importer already strips that marker, so the resolved word is identical.

² A handful of foreign entries differ by an accent or minor edit; still the same RefN / same word.

> **Conclusion:** every overlap row maps to an existing French 1 entry. None is new vocabulary. Skipping them avoids duplicate words and the single cross-volume `RefN` collision.

## ICC 21 rows (the 2 stray sentence rows)

- `RefN 2781`: Drill down — Welcome to the 200 Words a Day! French Sentence Course.  → identical
- `RefN 2812`: (empty) — A few clarifcations:  → identical

## Full ICC 1 list (French 1 vocab duplicates)

| RefN | French 2 (foreign) | French 2 (english) | French 1 (foreign) | French 1 (english) | Match |
|---|---|---|---|---|---|
| 4 | après, prep. | after, prep. | après, prep. | after, prep. | identical |
| 10 | bon, adj. | good, adj. | bon, adj. | good, adj. | identical |
| 15 | être ,v. | be ,v | être, v. | be, v. | cosmetic only |
| 19 | par, prep. | through, by, prep. | par, prep. | through, by, prep. | identical |
| 35 | anniversaire ,m. | birthday | anniversaire , m. | birthday, n. | cosmetic only |
| 41 | ensemble ,adv. | together | ensemble, adv. | together, adv. | cosmetic only |
| 47 | homme ,m. | man | homme , m. | man, n. | cosmetic only |
| 53 | nouvelles , f. pl. | news, n. | nouvelles , f. pl. | news, n. | identical |
| 76 | jardin ,m. | garden | jardin, m. | garden, n. | cosmetic only |
| 79 | maison ,f. | house | maison, f. | house, n. | cosmetic only |
| 88 | salle ,f. | room (hall) | salle, f. | room, n. | **foreign differs** |
| 94 | dedans ,adv. | inside | dedans, adv. | inside, adv. | cosmetic only |
| 98 | en, prep. | in, prep. | en, prep. | in, prep. | identical |
| 106 | là ,adv. | there | là, adv. | there, adv. | cosmetic only |
| 126 | chocolat ,m. | chocolate | chocolat, m. | chocolate, n. | cosmetic only |
| 128 | crème ,f. | cream | crème, f. | cream, n. | cosmetic only |
| 139 | goût, m. | taste, flavour, n. | goût, m. | taste, flavour, n. | identical |
| 141 | œuf , m. | egg, n. | œuf , m. | egg, n. | identical |
| 147 | cent ,num. | hundred | cent, num. | hundred, num. | cosmetic only |
| 150 | deux ,num. | two | deux, num. | two, num. | cosmetic only |
| 159 | onze, num. | eleven, num. | onze, num. | eleven, num. | identical |
| 164 | quatre-vingt-dix ,num. | ninety | quatre-vingt-dix, num. | ninety, num. | cosmetic only |
| 169 | soixante ,num. | sixty | soixante, num. | sixty, num. | cosmetic only |
| 179 | aujourd’hui ,adv. | today | aujourd`hui, adv. | today, adv. | **foreign differs** |
| 185 | fin ,f. | end | fin, f. | end, n. | cosmetic only |
| 186 | fois ,f. | time ,occasion | fois, f. | time, occasion, n. | **foreign differs** |
| 188 | jour, m. | day, n. | jour, m. | day, n. | identical |
| 192 | matin ,m. | morning (moment in time) | matin, m. | morning, n. | **foreign differs** |
| 196 | nuit ,f. | night | nuit, f. | night, n. | cosmetic only |
| 201 | soir ,m. | evening (moment in time) | soir, m. | evening, n. | **foreign differs** |
| 203 | tard, adv. | late, adv. | tard, adv. | late, adv. | identical |
| 209 | chaud, adj. | hot, adj. | chaud, adj. | hot, adj. | identical |
| 214 | froid ,adj. | cold | froid, adj. | cold, adj. | cosmetic only |
| 223 | pluie, f. | rain, n. | pluie, f. | rain, n. | identical |
| 225 | soleil ,m. | sun | soleil, m. | sun, n. | cosmetic only |
| 229 | vent, m. | wind, n. | vent, m. | wind, n. | identical |
| 233 | avoir mal à ,v. | feel pain in ,v | avoir mal à, v. | feel pain in, v. | cosmetic only |
| 240 | bien ,adv. | well | bien, adv. | well, adv. | cosmetic only |
| 251 | mieux ,adv. | better | mieux, adv. | better, adv. | cosmetic only |
| 254 | se casser ,v. | break ,v | se casser, v. | break, v. | cosmetic only |
| 264 | bouteille ,f. | bottle | bouteille, f. | bottle, n. | cosmetic only |
| 283 | servir ,v. | serve ,v | servir, v. | serve, v. | cosmetic only |
| 288 | toilettes,f. pl. | toilets | toilettes , f. pl. | toilets, n. | cosmetic only |
| 296 | de ,prep. | of ,from | de, prep. | of, from, prep. | **foreign differs** |
| 307 | nouveau ,adj. | new | nouveau, adj. | new, adj. | cosmetic only |
| 311 | plus ,adv. | more | plus, adv. | more, adv. | cosmetic only |
| 329 | famille ,f. | family | famille, f. | family, n. | cosmetic only |
| 330 | femme ,f. | woman ,wife | femme, f. | woman, wife, n. | **foreign differs** |
| 332 | frère ,m. | brother | frère, m. | brother, n. | cosmetic only |
| 338 | mère ,f. | mother | mère, f. | mother, n. | cosmetic only |
| 345 | père ,m. | father | père, m. | father, n. | cosmetic only |
| 353 | avril ,m. | April | avril, m. | April, n. | cosmetic only |
| 355 | demander, v. | ask, v. | demander, v. | ask, v. | identical |
| 357 | été ,m. | summer | été , m. | summer, n. | cosmetic only |
| 373 | printemps ,m. | spring | printemps, m. | spring, n. | cosmetic only |
| 382 | cuisine ,f. | kitchen | cuisine, f. | kitchen, n. | cosmetic only |
| 392 | manger ,v. | eat ,v | manger, v. | eat, v. | cosmetic only |
| 414 | fruit ,m. | fruit | fruit, m. | fruit, n. | cosmetic only |
| 432 | couleur ,f. | colour | couleur, f. | colour, n. | cosmetic only |
| 437 | noir ,adj. | black | noir, adj. | black, adj. | cosmetic only |
| 443 | affaires,f. pl. | business | affaires , f. pl. | business, n. | cosmetic only |
| 453 | centre ,m. | centre | centre, m. | centre, n. | cosmetic only |
| 457 | église ,f. | church | église , f. | church, n. | cosmetic only |
| 463 | hôpital ,m. | hospital | hôpital , m. | hospital, n. | cosmetic only |
| 483 | facile ,adj. | easy | facile, adj. | easy, adj. | cosmetic only |
| 484 | haut, adj. | tall, high, adj. | haut, adj. | tall, high, adj. | identical |
| 489 | libre ,adj. | free | libre, adj. | free, adj. | cosmetic only |
| 491 | malheureux ,adj. | unhappy ,unfortunate | malheureux, adj. | unhappy, unfortunate, adj. | **foreign differs** |
| 501 | à ,prep. | to ,at ,v | à, prep. | to, at, prep. | cosmetic only |
| 505 | chose ,f. | thing | chose, f. | thing, n. | cosmetic only |
| 510 | gens,m pl | people | gens , m. pl. | people, n. | **foreign differs** |
| 534 | amitié ,f. | friendship | amitié , f. | friendship, n. | cosmetic only |
| 546 | jouer ,v. | play ,v | jouer, v. | play, v. | cosmetic only |
| 547 | lettre ,f. | letter | lettre, f. | letter, n. | cosmetic only |
| 553 | rire ,v. | laugh ,v | rire, v. | laugh, v. | cosmetic only |
| 562 | bœuf ,m. | beef | bœuf, m. | beef, n. | cosmetic only |
| 563 | boire, v. | drink, v. | boire, v. | drink, v. | identical |
| 566 | café ,m.-2 | coffee | café, m. | coffee, n. | **foreign differs** |
| 571 | eau ,f. | water | eau , f. | water, n. | cosmetic only |
| 574 | jus ,m. | juice | jus, m. | juice, n. | cosmetic only |
| 586 | vin ,m. | wine | vin, m. | wine, n. | cosmetic only |
| 588 | argent ,m. | money | argent , m. | money, n. | cosmetic only |
| 589 | banque ,f. | bank | banque, f. | bank, n. | cosmetic only |
| 591 | chèque ,m. | cheque ,check | chèque, m. | cheque, check, n. | **foreign differs** |
| 595 | compte ,m. | account | compte, m. | account, n. | cosmetic only |
| 606 | nom ,m. | name | nom, m. | name, n. | cosmetic only |
| 610 | poste ,f. | post ,mail | poste, f. | post, mail, n. | **foreign differs** |
| 638 | cœur ,m. | heart | cœur, m. | heart, n. | cosmetic only |
| 643 | doigt ,m. | finger | doigt, m. | finger, n. | cosmetic only |
| 656 | œil ,m. | eye | œil , m. | eye, n. | cosmetic only |
| 668 | avion ,m. | plane | avion , m. | plane, n. | cosmetic only |
| 681 | gare ,f. | station | gare, f. | station, n. | cosmetic only |
| 692 | acheter ,v. | buy ,v | acheter, v. | buy, v. | cosmetic only |
| 699 | coûter ,v. | cost ,v | coûter, v. | cost, v. | cosmetic only |
| 701 | désirer ,v. | want ,v | désirer, v. | want, v. | cosmetic only |
| 706 | magasin ,m. | shop | magasin, m. | shop, n. | cosmetic only |
| 713 | payer ,v. | pay ,v | payer, v. | pay, v. | cosmetic only |
| 714 | prendre ,v. | take ,v | prendre, v. | take, v. | cosmetic only |
| 724 | commencer ,v. | begin ,v | commencer, v. | begin, v. | cosmetic only |
| 730 | entendre ,v. | hear ,v | entendre, v. | hear, v. | cosmetic only |
| 735 | mettre ,v. | put ,v | mettre, v. | put, v. | cosmetic only |
| 736 | perdre ,v. | lose ,v | perdre, v. | lose, v. | cosmetic only |
| 744 | tirer ,v. | pull ,v | tirer, v. | pull, v. | cosmetic only |
| 751 | chaussure ,f. | shoe | chaussure, f. | shoe, n. | cosmetic only |
| 769 | aimer ,v. | like ,to love ,v | aimer, v. | like, to love, v. | cosmetic only |
| 770 | aller ,v. | go ,v | aller, v. | go, v. | cosmetic only |
| 771 | avec ,prep. | with | avec, prep. | with, prep. | cosmetic only |
| 773 | dire ,v. | say ,v | dire, v. | say, v. | cosmetic only |
| 774 | faire ,v. | do ,to make ,v | faire, v. | do, to make, v. | cosmetic only |
| 787 | qui ,prn. | who (whom) | qui, prn. | who, prn. | **foreign differs** |
| 792 | temps ,m.-1 | time | temps, m. | time, n. | **foreign differs** |
| 796 | voir ,v. | see ,v | voir, v. | see, v. | cosmetic only |
| 797 | vouloir ,v. | wish ,to want ,v | vouloir, v. | wish, to want, v. | cosmetic only |
| 801 | chambre ,f. | bedroom | chambre, f. | bedroom, n. | cosmetic only |
| 805 | dormir ,v. | sleep ,v | dormir, v. | sleep, v. | cosmetic only |
| 810 | lit ,m. | bed | lit, m. | bed, n. | cosmetic only |
| 818 | s’habiller ,v. | get dressed ,v | s`habiller, v. | get dressed, v. | **foreign differs** |
| 821 | se réveiller ,v. | wake up ,v | se réveiller, v. | wake up, v. | cosmetic only |
| 829 | carte ,f. | map | carte, f. | map, n. | cosmetic only |
| 841 | photo ,f. | photo | photo, f. | photo, n. | cosmetic only |
| 847 | vacances,f. pl. | vacations ,holidays | vacances , f. pl. | vacations, holidays, n. | **foreign differs** |
| 881 | sans doute!, exc. | no doubt!, exc. | sans doute!, exc. | no doubt!, exc. | identical |
| 885 | animal ,m. | animal | animal , m. | animal, n. | cosmetic only |
| 887 | chat ,m. | cat | chat, m. | cat, n. | cosmetic only |
| 891 | cochon ,m. | pig | cochon, m. | pig, n. | cosmetic only |
| 897 | oiseau ,m. | bird | oiseau , m. | bird, n. | cosmetic only |
| 899 | souris ,f. | mouse | souris, f. | mouse, n. | cosmetic only |
| 912 | fou ,adj. | mad ,crazy | fou, adj. | mad, crazy, adj. | **foreign differs** |
| 922 | mourir ,v. | die ,v | mourir, v. | die, v. | cosmetic only |
| 932 | apprendre ,v. | learn ,v | apprendre, v. | learn, v. | cosmetic only |
| 955 | mot ,m. | word | mot, m. | word, n. | cosmetic only |
| 973 | grand ,adj. | big | grand, adj. | big, adj. | cosmetic only |
| 976 | ne … jamais ,adv. | never | ne … jamais, adv. | never, adv. | cosmetic only |
| 978 | ne … rien, adv. | nothing, adv. | ne … rien, adv. | nothing, adv. | identical |
| 986 | bois ,m. | wood | bois, m. | wood, n. | cosmetic only |
| 989 | chemin ,m. | path ,way | chemin, m. | path, way, n. | **foreign differs** |
| 994 | feu ,m. | fire (hearth) | feu, m. | fire, n. | **foreign differs** |
| 1003 | mer ,f. | sea | mer, f. | sea, n. | cosmetic only |
| 1006 | mur ,m. | wall | mur, m. | wall, n. | cosmetic only |
| 1008 | pays ,m. | country | pays, m. | country, n. | cosmetic only |
| 1024 | jeu ,m. | game | jeu, m. | game, n. | cosmetic only |
| 1035 | sport ,m. | sport | sport, m. | sport, n. | cosmetic only |
| 1040 | un peu ,m. | a little | un peu, m. | a little, n. | cosmetic only |
