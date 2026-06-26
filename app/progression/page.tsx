import { redirect } from 'next/navigation'

// Le composant ProgressionClient vit toujours dans ce dossier (importé par
// l'onglet « Ma progression » de la page « Aller plus loin »), mais cette
// page-ci ne fait plus que rediriger, pour ne pas casser d'anciens liens.
export default function ProgressionPage() {
  redirect('/traductions?onglet=progression')
}