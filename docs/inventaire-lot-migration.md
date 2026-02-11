# Inventaire lots - stratégie de migration

## Objectif

Introduire le suivi par lot/expiration sans interrompre le flux existant de gestion des stocks.

## État actuel

- Le stock global produit reste stocké dans `products.stockQuantity`.
- Les nouveaux flux de réception (bons de livraison) permettent de saisir des lots (`lotNumber`, `expiryDate`, `quantity`).
- Les quantités par lot sont persistées dans `stockLots`.

## Stratégie de backfill des stocks historiques (sans lot)

1. Garder `products.stockQuantity` comme source de vérité pendant la phase de transition.
2. Créer des lots de migration (`sourceType = "MIGRATION"`) uniquement pour les produits qui ont un stock positif et aucun lot actif.
3. Générer un lot synthétique par produit:
   - `lotNumber = MIG-{productId}`
   - `expiryDate = 4102358400000` (2099-12-31)
   - `quantity = stockQuantity` courant
4. Exécuter le backfill en batch (100 produits/batch) pour limiter les conflits OCC.
5. Vérifier l’égalité post-migration:
   - `sum(stockLots.quantity) == products.stockQuantity` par produit.
6. Après stabilisation, basculer les rapports inventaire pour prioriser la vue lot.

## Règles métier en transition

- Toute réception marquée `Livré` doit avoir des lots complets (numéro, expiration, quantité).
- Collision interdite sur un même produit et un même `lotNumber` avec une expiration différente.
- Date d’expiration invalide ou passée rejetée.
