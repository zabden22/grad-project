$pages = @('admins.html','buses.html','drivers.html','stations.html','tickets.html','routes.html','reports.html','settings.html','map.html')

foreach ($page in $pages) {
    $content = Get-Content $page -Raw -Encoding UTF8
    
    # Replace sidebar opening tag
    $content = $content -replace '<aside class="sidebar">', @"
        <!-- Sidebar Overlay -->
        <div class="sidebar-overlay" id="sidebarOverlay"></div>

        <aside class="sidebar" id="mainSidebar">
"@

    # Add top-bar-left wrapper with toggle button and logo after <header class="top-bar">
    $content = $content -replace '(<header class="top-bar">)\s*\r?\n\s*(<h2 class="path-title")', @"
            <header class="top-bar">
                <div class="top-bar-left">
                    <button class="sidebar-toggle" id="sidebarToggle" title="Toggle Sidebar">
                        <i class="fas fa-bars"></i>
                    </button>
                    <img src="11fc662484192f59b3906d1d5669228f9f707453.png" alt="TransitWay" class="top-bar-logo">
                    `$2
"@

    # Close the top-bar-left div after the path-title
    $content = $content -replace '(<h2 class="path-title"[^>]*>[^<]*</h2>)\s*\r?\n\s*(<div class="top-controls">)', @"
                    `$1
                </div>
                `$2
"@

    [System.IO.File]::WriteAllText((Join-Path $PSScriptRoot $page), $content, [System.Text.Encoding]::UTF8)
    Write-Output "Updated: $page"
}
