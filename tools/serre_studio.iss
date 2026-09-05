#define AppName "La Serre"
#define AppPublisher "La Serre"
#define AppExeName "SerreStudio.exe"
#define AppVersion GetEnv("SERRE_STUDIO_VERSION")
#if AppVersion == ""
  #define AppVersion "0.2.11"
#endif

[Setup]
AppId={{4BF64BB8-151E-4B6B-8EFC-A4032A45E266}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
DefaultDirName={localappdata}\Programs\SerreStudio
DefaultGroupName={#AppName}
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
OutputDir=..\dist-installer
OutputBaseFilename=SerreStudio-Setup-{#AppVersion}
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
UninstallDisplayIcon={app}\{#AppExeName}
SetupIconFile=..\assets\branding\la-serre.ico
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible

[Languages]
Name: "french"; MessagesFile: "compiler:Languages\French.isl"

[Tasks]
Name: "desktopicon"; Description: "Créer un raccourci sur le bureau"; GroupDescription: "Raccourcis :"; Flags: unchecked

[Files]
Source: "..\dist\{#AppExeName}"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#AppName}"; Filename: "{app}\{#AppExeName}"
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\{#AppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#AppExeName}"; Description: "Lancer {#AppName}"; Flags: nowait postinstall skipifsilent

[UninstallRun]
Filename: "{app}\{#AppExeName}"; Parameters: "--remove-custom-project-data ""{tmp}\serre-studio-uninstall-inventory.json"" --confirm-data-removal ""SUPPRIMER-LES-DONNEES-SERRE-STUDIO"""; Flags: runhidden waituntilterminated; Check: ShouldRemoveCustomProjectData

[UninstallDelete]
Type: filesandordirs; Name: "{localappdata}\SerreStudio"; Check: ShouldRemoveStudioData

[Code]
var
  RemoveStudioData: Boolean;
  RemoveCustomProjectData: Boolean;
  UninstallInventoryPath: String;

function ShouldRemoveStudioData(): Boolean;
begin
  Result := RemoveStudioData;
end;

function ShouldRemoveCustomProjectData(): Boolean;
begin
  Result := RemoveCustomProjectData;
end;

function InitializeUninstall(): Boolean;
var
  ResultCode: Integer;
  Inventory: AnsiString;
  InventoryDisplay: String;
begin
  Result := True;
  RemoveStudioData := False;
  RemoveCustomProjectData := False;
  UninstallInventoryPath := ExpandConstant(
    '{tmp}\serre-studio-uninstall-inventory.json'
  );

  if MsgBox(
    'Supprimer aussi les données locales de La Serre ?' + #13#10 + #13#10 +
    'Dossier concerné : ' + ExpandConstant('{localappdata}\SerreStudio') + #13#10 +
    'Choisis Non pour conserver projets, réglages, journaux et rendus.',
    mbConfirmation,
    MB_YESNO
  ) <> IDYES then
    exit;

  RemoveStudioData := True;
  if Exec(
    ExpandConstant('{app}\{#AppExeName}'),
    '--uninstall-inventory "' + UninstallInventoryPath + '"',
    '',
    SW_HIDE,
    ewWaitUntilTerminated,
    ResultCode
  ) and (ResultCode = 0) and LoadStringFromFile(UninstallInventoryPath, Inventory) then
  begin
    InventoryDisplay := String(Inventory);
    if Pos('"custom_path_count": 0', InventoryDisplay) = 0 then
      RemoveCustomProjectData :=
        MsgBox(
          'Des dossiers projet personnalisés existent hors du dossier local du Studio.' +
          #13#10 + #13#10 + InventoryDisplay + #13#10 +
          'Les supprimer définitivement eux aussi ?' + #13#10 +
          'Choisis Non pour les conserver sur le disque.',
          mbError,
          MB_YESNO
        ) = IDYES;
  end;
end;
