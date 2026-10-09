param(
    [string]$AppArguments = '',
    [ValidatePattern('^\d+(,\d+)*$')][string]$RestartProcessIds
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
$package = Get-AppxPackage -Name 'OpenAI.Codex' | Sort-Object Version -Descending | Select-Object -First 1
if (-not $package) { throw 'Codex Windows package was not found.' }
$manifest = Get-AppxPackageManifest -Package $package.PackageFullName
$application = @($manifest.Package.Applications.Application) |
    Where-Object { $_.Executable -match '(^|[\\/])(ChatGPT|Codex)\.exe$' } |
    Select-Object -First 1
if (-not $application) { throw 'Codex application entry was not found in the package manifest.' }

# 通过应用包激活保留 MSIX 身份，同时将调试参数交给应用；直接启动 EXE 会丢失身份。
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

namespace CodexTheme {
    [ComImport, Guid("2e941141-7f97-4756-ba1d-9decde894a3d"),
     InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IApplicationActivationManager {
        [PreserveSig]
        int ActivateApplication(
            [MarshalAs(UnmanagedType.LPWStr)] string appUserModelId,
            [MarshalAs(UnmanagedType.LPWStr)] string arguments,
            uint options, out uint processId);
        [PreserveSig]
        int ActivateForFile(
            [MarshalAs(UnmanagedType.LPWStr)] string appUserModelId,
            IntPtr itemArray, [MarshalAs(UnmanagedType.LPWStr)] string verb,
            out uint processId);
        [PreserveSig]
        int ActivateForProtocol(
            [MarshalAs(UnmanagedType.LPWStr)] string appUserModelId,
            IntPtr itemArray, out uint processId);
    }

    public static class PackagedApp {
        public static uint Activate(string appId, string arguments) {
            var type = Type.GetTypeFromCLSID(new Guid("45ba127d-10a8-46ea-8ab7-56ea9078943c"));
            var manager = (IApplicationActivationManager)Activator.CreateInstance(type);
            try {
                uint processId;
                int result = manager.ActivateApplication(appId, arguments, 2, out processId);
                Marshal.ThrowExceptionForHR(result);
                return processId;
            } finally {
                Marshal.ReleaseComObject(manager);
            }
        }
    }
}
'@

$appId = $package.PackageFamilyName + '!' + $application.Id
# 调用方仅在用户确认后传入进程号；关闭前再次核对路径，避免误关命令行或其它程序。
if ($RestartProcessIds) {
    $expectedExecutable = Join-Path $package.InstallLocation $application.Executable
    $targets = @(
        foreach ($value in $RestartProcessIds.Split(',')) {
            $target = Get-Process -Id ([int]$value) -ErrorAction SilentlyContinue
            if (-not $target) { continue }
            if ($target.Path -ine $expectedExecutable) {
                throw 'The Codex process changed. No restart was performed; please close Codex from the system tray.'
            }
            $target
        }
    )
    foreach ($target in $targets) { $target.Kill() }
    foreach ($target in $targets) {
        if (-not $target.WaitForExit(10000)) { throw 'Codex did not exit in time. Please close it from the system tray.' }
    }
}
$activatedProcessId = [CodexTheme.PackagedApp]::Activate($appId, $AppArguments)
if ($activatedProcessId -eq 0) { throw 'Codex activation returned no process ID.' }
[Console]::Out.Write($activatedProcessId)
