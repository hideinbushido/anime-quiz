# Portraits du Dossier de L — dragon-ball

Une image par personnage, nommée d'après son identifiant : `son-goku.webp`
(ou `.png`, `.jpg`). Le serveur la rattache à sa fiche au démarrage ; un
personnage sans image garde son initiale.

`portraits.json` donne, pour chaque identifiant, le nom du fichier de son portrait
principal sur le wiki. Pour ranger d'un coup des images téléchargées sous ce nom :

    node scripts/dossier/images.mjs ranger <dossier-des-images> dragon-ball

Le script les réduit en carrés de 200 px et les nomme tout seul.
