# YonelMa — Guide d'utilisation

**Environnement de démonstration · Phase 1 (Sénégal → Sénégal)**
Document de travail — novembre 2026

Ce guide explique comment utiliser la plateforme pour chacun des quatre rôles.
Il correspond à l'environnement de test : aucun paiement réel n'est encaissé et
les tarifs affichés sont provisoires.

---

## 1. Avant de commencer

### Créer les comptes

Connectez-vous à la console d'administration (`/admin/login`), puis ouvrez
**Personnel**. Créez un compte pour chaque personne :

| Rôle | Ce que la personne peut faire |
|---|---|
| Administrateur | Tout configurer : boutiques, zones, tarifs, planning, personnel |
| Commerçant point relais | Accepter les colis livrés à **sa** boutique et les remettre aux clients |
| Chauffeur / coursier | Collecter, transporter, remettre en boutique, livrer à domicile |
| Support / superviseur | Consulter, rechercher, corriger avec motif |

À la création d'un compte, un **mot de passe temporaire** s'affiche une seule
fois. Notez-le et transmettez-le à la personne concernée. Il n'est jamais
réaffiché : en cas d'oubli, cliquez sur **Réinitialiser** pour en générer un
nouveau.

> Pour un commerçant, sélectionnez la ou les boutiques auxquelles il a accès.
> Il ne verra que les colis de ces boutiques.

### Vérifier la configuration

Dans l'ordre, vérifiez :

1. **Zones** — la région de Dakar doit être « Ouverte commercialement ».
   Thiès reste en « Test » tant que le service n'y est pas lancé.
2. **Points relais** — chaque boutique doit être **Active** *et* **Ouverte
   commercialement** pour apparaître à la réservation.
3. **Tarifs** — vérifiez les quatre tranches de poids.
4. **Planning** — jours de transport, heure limite de dépôt, délais annoncés.

---

## 2. Client — réserver un envoi

1. Créer un compte ou se connecter.
2. **Envoyer un colis** → onglet **Sénégal → Sénégal**.
3. **Trajet** : choisir le mode de dépôt et de retrait, puis la ville et le
   point relais. L'écran affiche la date du prochain transport et la fourchette
   de retrait estimée.
4. **Colis** : saisir le poids et le contenu. Cliquer sur **Ajouter un colis**
   pour en déclarer plusieurs dans la même réservation — chacun aura son propre
   numéro, son étiquette et son code de retrait.
5. **Destinataire** : nom et téléphone obligatoires. L'e-mail est facultatif
   mais permet l'envoi automatique du code de retrait.
6. **Récapitulatif** : vérifier le prix, puis confirmer.

### Après la réservation

- **Mes envois → Étiquettes** : imprimer une étiquette par colis et la coller
  sur le colis correspondant avant le dépôt.
- **Mes envois → Codes de retrait** : le code de chaque colis est masqué par
  défaut ; cliquer sur **Afficher le code**. Ce code est confidentiel et ne doit
  être communiqué qu'au destinataire.

---

## 3. Chauffeur — ma tournée

Ouvrir `/driver`. L'écran affiche uniquement les colis de vos tournées
planifiées ou en cours.

| Étape | Quand l'utiliser |
|---|---|
| **Collecte** | Vous prenez le colis au point de départ |
| **Départ** | Vous quittez le point de départ |
| **Remise au relais** | Vous déposez le colis dans la boutique destinataire |
| **Livraison à domicile** | Vous remettez le colis au destinataire chez lui |

Pour chaque étape : sélectionner l'étape, puis **Scanner**. Si la caméra ne
fonctionne pas ou si l'étiquette est abîmée, saisir le numéro du colis
(`YM-SN-000128`) dans le champ prévu — cela fonctionne exactement de la même
manière.

**Livraison à domicile** : après le scan, demander au destinataire son code
confidentiel à 6 chiffres. La date, l'heure et votre identité sont enregistrées
automatiquement. Si la livraison échoue, utiliser **Tentative échouée** et
indiquer le motif.

> Important : déposer un colis en boutique ne le rend pas disponible pour le
> client. C'est le commerçant qui confirme la réception. Vous n'êtes donc pas
> tenu responsable d'un colis que la boutique n'a pas accepté.

---

## 4. Commerçant point relais

Ouvrir `/merchant`. Deux onglets :

**Réception** — à l'arrivée du chauffeur, scanner chaque colis. Le colis
devient alors « Disponible pour retrait » et le code est envoyé au destinataire
s'il a fourni un e-mail. Ne scannez que les colis réellement reçus et destinés
à votre boutique.

**Remise au client** — scanner le colis, puis saisir le code à 6 chiffres
présenté par le destinataire. Sans le bon code, la remise est refusée.

**Anomalie** — pour un colis endommagé, manquant, ou livré par erreur chez
vous : bouton **Anomalie**, décrire le problème. L'administrateur est alerté.

---

## 5. Administrateur

| Écran | Usage |
|---|---|
| **Opérations** | Vue d'ensemble : créés, en transit, en point relais, livrés, incidents. Filtres par relais, zone, statut et dates. Export Excel. |
| **Tournées** | Planifier une tournée, y affecter des colis, la démarrer et la terminer. |
| **Points relais** | Créer une boutique, la soumettre, l'approuver, la suspendre. Horaires et capacité. |
| **Zones** | Ouvrir commercialement une nouvelle région ou la repasser en test. |
| **Tarifs** | Créer, modifier, activer ou désactiver un tarif par zone, poids et mode de livraison. |
| **Planning** | Jours de transport, heure limite, délais annoncés, fermetures exceptionnelles. |
| **Personnel** | Comptes, rôles, accès aux boutiques, réinitialisation des mots de passe. |

### Retrouver un colis

**Opérations** → rechercher par numéro de colis, de commande, ou nom du
destinataire. Cliquer sur un colis affiche son **historique complet** : qui a
fait quoi, à quel moment, et si l'information vient d'un scan, d'une saisie
manuelle ou d'une déclaration client.

---

## 6. Démonstration Dakar → Rufisque

Un envoi de démonstration est déjà chargé :

- Numéro de suivi : **`YMT-DEMO2026`**
- Colis : `YM-SN-800001` (disponible au retrait) et `YM-SN-800002` (en transit)
- Code de retrait de démonstration : **`482913`**

Parcours conseillé :

1. Page **Suivre un colis** → saisir `YMT-DEMO2026`. Les deux colis
   apparaissent avec leur historique et l'adresse de la boutique.
2. Console → **Opérations** : les deux colis dans leurs catégories.
3. Compte commerçant → **Remise au client** : scanner `YM-SN-800001`, saisir
   `482913`, confirmer.
4. Console → **Opérations** : le colis est passé en « Retiré ».

---

## 7. Limites connues de cette phase

- **Aucun paiement en ligne.** Le règlement se fait au dépôt. Le paiement par
  carte est désactivé tant que la conformité n'est pas validée.
- **Envoi d'e-mails à configurer.** Tant que le service d'envoi n'est pas
  connecté, le code de retrait n'est pas transmis automatiquement au
  destinataire : l'expéditeur le communique lui-même depuis son espace.
- **Pas de SMS ni de WhatsApp.** Prévu techniquement, mais non activé en
  Phase 1 (aucun abonnement de messagerie).
- **Scan hors connexion non disponible.** En cas de réseau faible, utiliser la
  saisie manuelle du numéro de colis.
- **Tarifs provisoires.** Les montants ne sont pas validés commercialement.
- **Colis de plus de 20 kg** : la réservation est acceptée « sur devis », sans
  prix automatique, en attendant la règle définitive.
- **France → Sénégal inchangé.** Aucune modification commerciale, contractuelle
  ou de facturation n'a été faite, conformément à l'attente de l'avis juridique.
