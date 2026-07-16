!ifdef BUILD_UNINSTALLER
Var ProjectDKeepUserData
!endif

!macro customInstall
  CreateDirectory "$APPDATA\Project D"
  FileOpen $0 "$APPDATA\Project D\ProjectD-Recover-Desktop.bat" w
  FileWrite $0 "@echo off$\r$\n"
  FileWrite $0 "reg add HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced /v HideIcons /t REG_DWORD /d 0 /f$\r$\n"
  FileWrite $0 "RUNDLL32.EXE user32.dll,UpdatePerUserSystemParameters$\r$\n"
  FileWrite $0 "echo Project D desktop recovery completed.$\r$\n"
  FileWrite $0 "pause$\r$\n"
  FileClose $0
!macroend

!macro customUnInit
  StrCpy $ProjectDKeepUserData "1"
  IfSilent projectd_restore_desktop
  MessageBox MB_YESNO|MB_ICONQUESTION "是否保留 Project D 的设置、场景和聊天记录？$\n选择“否”会彻底删除当前用户数据。" IDYES projectd_restore_desktop IDNO projectd_delete_data
projectd_delete_data:
  StrCpy $ProjectDKeepUserData "0"
projectd_restore_desktop:
  ExecWait '"$SYSDIR\reg.exe" add "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" /v HideIcons /t REG_DWORD /d 0 /f'
  ExecWait '"$SYSDIR\RUNDLL32.EXE" user32.dll,UpdatePerUserSystemParameters'
!macroend

!macro customUnInstall
  StrCmp $ProjectDKeepUserData "0" 0 projectd_uninstall_done
  RMDir /r "$APPDATA\Project D"
  RMDir /r "$APPDATA\project-d"
projectd_uninstall_done:
  SetOutPath "$TEMP"
  RMDir "$INSTDIR"
!macroend
