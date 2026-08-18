' Lanceur silencieux de La Gueule : démarre le serveur local (fenêtre cachée) et ouvre
' l'application dans sa propre fenêtre. Double-clic depuis le raccourci du bureau.
Dim shell, fso, ici
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
ici = fso.GetParentFolderName(WScript.ScriptFullName)
shell.CurrentDirectory = ici
' 0 = fenêtre cachée (pas de console), False = ne pas attendre la fin.
shell.Run "node bin\gueule.mjs serve --open", 0, False
