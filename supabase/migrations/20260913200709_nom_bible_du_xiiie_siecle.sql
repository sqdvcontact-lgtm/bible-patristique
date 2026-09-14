-- « Bible XIIIe » était un titre trop sec : la famille reprend le nom que lui donnent les
-- spécialistes, « Bible du XIIIe siècle » (décision de l'auteur, 2026-09-13). Le siècle se
-- compose à l'écran en petites capitales et son exposant, par `rendreEnrichi`.
-- Chaque mise à jour est gardée par l'ancien nom : rejouée, elle ne touche plus rien.
update public.traductions set nom = 'Bible du XIIIe siècle – Ancien français'
 where trad_id = 'TR0009' and nom = 'Bible XIIIe – Ancien français';
update public.traductions set nom = 'Bible du XIIIe siècle – Français moderne'
 where trad_id = 'TR0013' and nom = 'Bible XIIIe – Français moderne';
