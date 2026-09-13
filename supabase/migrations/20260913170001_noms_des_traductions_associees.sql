-- Les traductions d'une même famille d'édition portent un nom commun suivi de leur
-- langue (décision de l'auteur, 2026-09-13). Deux « Bible française du XIIIe siècle »
-- se confondaient dans le menu du lecteur comme dans l'administration.
-- Chaque mise à jour est gardée par l'ancien nom : rejouée, elle ne touche plus rien.
update public.traductions set nom = 'Bible XIIIe – Français moderne'
 where trad_id = 'TR0013' and nom = 'Bible française du XIIIe siècle';
update public.traductions set nom = 'Bible XIIIe – Ancien français'
 where trad_id = 'TR0009' and nom = 'Bible française du XIIIe siècle';
update public.traductions set nom = 'Bible Fillion – Français'
 where trad_id = 'TR0010' and nom = 'Bible Fillion';
update public.traductions set nom = 'Bible Fillion – Latin (Vulgate)'
 where trad_id = 'TR0011' and nom = 'Vulgate latine (Fillion)';
