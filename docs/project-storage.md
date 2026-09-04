# Stockage des projets

Le Studio sépare le registre des projets de leurs données. Deux racines sont
configurables dans **Réglages > Stockage des projets** :

- work_root contient le scénario, la bible et les fichiers de travail ;
- output_root contient les images, voix, clips, historiques et masters.

Par défaut, les deux racines sont identiques. Un projet rose-noire utilise
alors :

    <racine>/rose-noire/
    ├── work/
    └── output/

Avec des racines séparées :

    <work_root>/rose-noire/
    <output_root>/rose-noire/

Modifier les racines ne déplace jamais les projets existants. Cela évite toute
perte de données ; seuls les projets créés ensuite utilisent les nouveaux
emplacements. Les anciens registres restent lisibles et sont marqués comme
historiques.

## Retirer un projet

Le gestionnaire de projets affiche les chemins absolus et permet de les copier
ou de les ouvrir dans l’Explorateur Windows. Un projet non actif peut être :

1. désenregistré en conservant tous ses fichiers ;
2. supprimé avec ses dossiers work et output.

La suppression physique exige de recopier le nom exact du projet. Elle est
refusée pour le projet actif, le dernier projet, un projet historique, un
chemin déplacé, un lien symbolique ou un dossier sans manifeste de propriété
valide. Le Studio ne supprime jamais une racine entière.

## Désinstallation Windows

Le désinstalleur demande explicitement si les données locales doivent être
supprimées. Les dossiers personnalisés hors de %LOCALAPPDATA%\SerreStudio
sont inventoriés et affichés séparément ; ils sont conservés par défaut.
L’effacement utilise l’inventaire confirmé et revalide les manifests juste
avant la suppression.
