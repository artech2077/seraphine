# Seraphine · Prototype de trésorerie

Deux pages HTML autonomes, en français, avec CSS et JavaScript natifs. Aucun service externe, compte, base de données ou déploiement. Les polices et le logo sont locaux.

## Ouvrir le prototype

Depuis la racine du dépôt :

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory POC
```

- Saisie : <http://127.0.0.1:4173/saisie.html>
- Tableau mensuel : <http://127.0.0.1:4173/tresorerie.html>

Le serveur sert uniquement les fichiers statiques. Il ne reçoit ni ne conserve les montants. Utiliser les deux pages sur la même adresse et le même port, afin de partager le même localStorage. Ouvrir les pages via HTTP, plutôt que par double-clic : elles utilisent des modules JavaScript.

La date par défaut utilise le fuseau Europe/Paris. Les données initiales du mois courant sont fictives. Le bouton de réinitialisation restaure cette démonstration après confirmation et retire les mois créés pendant les essais.

## Fichiers

- `saisie.html`, `tresorerie.html` : les deux pages.
- `styles.css` : tokens repris de `app/globals.css`, complétés pour les tableaux de trésorerie.
- `model.mjs` : calendrier, calculs, validation et mises à jour des données.
- `app.js` : rendu et interactions des deux pages.
- `main.mjs` : démarrage dans le navigateur.
- `assets/` : logo Seraphine existant et police Inter issue des assets du projet.
- `features/treasury/__tests__/` : tests du modèle et de l’interface.
- `verification/` : captures des pages vérifiées sur ordinateur et téléphone.

Le choix explicite de pages HTML/CSS/JavaScript autonomes remplace, uniquement dans ce dossier, les exigences React, Tailwind et shadcn du dépôt. L’application principale et ses intégrations ne sont pas modifiées.

## Comportements

- Une date sélectionnée charge sa saisie sans écrire dans le stockage ni créer de mois.
- Un premier enregistrement crée le mois, avec les jours du lundi au samedi pour la caisse principale et les jeudis pour TMZ. Les autres journées enregistrées s’ajoutent au calendrier.
- Une entrée enregistrée est en lecture seule jusqu’à « Modifier la saisie ». Une correction conserve la même clé de date.
- Un jour férié conserve sa date et son nom. Une confirmation précède l’effacement de ses montants. La réouverture sans montant est autorisée. Les calculs passent au prochain jour travaillé, puis au FCMF en fin de mois.
- Les soldes fournisseurs sont remplacés. Ils n’ont pas d’historique quotidien. Pour Sorepha, le 25 met à jour la période 1–25, le 26 met à jour la période 26–fin de mois, sans toucher à l’autre.
- L’ajout d’un fournisseur peut viser une liste ou les deux. Les doublons sont refusés dans chaque liste sélectionnée, après normalisation des espaces et de la casse.
- Une mise à jour concurrente dans un autre onglet est signalée. Une saisie périmée ne peut pas écraser silencieusement les nouvelles valeurs.
- Les confirmations utilisent un dialogue accessible dans la page. Les boutons, champs et liens sont accessibles au clavier ; Échap ferme le dialogue en annulant.

## Calculs et limites

Les règles suivent la demande et les fonctions `tableFormulas_`, `sorephaRows_` et `supplierTotal_` du précédent `outputs/Code.gs`, consulté localement, ainsi que la structure de `outputs/Index.html`. Le visuel suit la capture de feuille fournie et les tokens Seraphine. Aucune donnée financière de ces sources n’a été copiée.

Les CA, crédits, frais et remises de la caisse principale, ainsi que les FCMF et stocks, sont des valeurs fictives identifiées par un astérisque. Une saisie du formulaire conserve les valeurs de démonstration existantes hors de son périmètre. Un nouveau mois laisse ces valeurs non disponibles vides.

Une donnée nécessaire absente produit « … », sans traiter un champ vide comme zéro. Un total de recettes calculées incomplet affiche également « … » et une note explicite. Les autres totaux additionnent les montants renseignés. Les divisions par zéro donnent 0 %.

La colonne « CA ? », l’ARDM et la marge brute n’ont pas de règle établie dans le périmètre fourni. Elles affichent des espaces réservés ; aucune formule n’a été inventée.

Le stockage reste propre au navigateur et à l’origine HTTP. Il ne synchronise pas plusieurs appareils. Une navigation interne avec des modifications non enregistrées demande confirmation. Les dates de démonstration sont limitées à 1900–2100.

## Vérification, 20/10/2026

Commandes exécutées :

```sh
pnpm test:run POC/features/treasury/__tests__
pnpm lint
pnpm exec eslint POC
pnpm exec prettier --check POC/*.html POC/*.css POC/*.js POC/*.mjs POC/features/treasury/__tests__/*.mjs
```

18 tests du prototype passent. Lint du dépôt et du prototype : succès. Formatage : succès. Le prototype n’utilise pas de compilation ; le build Next.js de l’application principale n’est pas nécessaire pour le servir. Aucun backend ou code Convex n’a été ajouté.

Parcours exécutés dans le navigateur sur les pages servies localement :

1. Ouvrir novembre 2026 sans créer de données ; ouvrir une ligne dans le formulaire.
2. Enregistrer le dimanche 08/11 avec fonds égal à 0 ; modifier explicitement les recettes ; actualiser et retrouver la saisie verrouillée.
3. Annuler puis confirmer la transformation en jour férié ; vérifier le nom dans la bande grise du tableau ; rouvrir la journée sans montant. Vérifier une seule ligne pour cette date.
4. Le 25/11, enregistrer Sorepha à 12 500 et Soremed à 3 000. Le 26/11, enregistrer Sorepha à 4 200 et remplacer Soremed par 2 000. Vérifier le total 18 700 et les deux périodes Sorepha sur le tableau.
5. Enregistrer une saisie TMZ hors jeudi, avec frais égaux à 0.
6. Refuser un doublon Soremed ; ajouter Atlas Démo aux deux listes et vérifier les deux champs.
7. Réinitialiser depuis les deux pages et confirmer le retour des données fictives initiales. Les saisies de vérification ont été retirées du navigateur de prévisualisation.
8. Vérifier les deux pages à 375 px : aucun débordement horizontal de page, champs de montant de 46 px et police de 16 px. Les tableaux de 1 120 px défilent dans leur panneau de 341 px.
9. Vérifier la saisie en paysage 812 × 375 et le tableau sur ordinateur 1 440 × 1 000.
10. Activer la préférence de mouvement réduit et vérifier une transition de 0 s, puis rétablir le réglage de prévisualisation.

Les tests automatisés couvrent aussi les jours fériés consécutifs, le FCMF, les changements répétés de statut, les montants invalides, l’échappement des noms de fournisseurs et les écritures concurrentes.

## Simplification de l’interface

La navigation est horizontale et la saisie est centrée, sans barre latérale ni panneau de contexte. Les descriptions signalées ont été supprimées. La palette utilise les verts et les surfaces neutres de Seraphine. Les messages de validation, les confirmations et les libellés de période Sorepha sont conservés.
