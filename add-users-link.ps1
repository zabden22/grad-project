$files = Get-ChildItem "c:\Users\lenovo\Downloads\New Project to publish it\gradution project 5\*.html" | Where-Object { $_.Name -ne "users.html" -and $_.Name -ne "index.html" -and $_.Name -ne "help.html" }
foreach ($f in $files) {
    $content = Get-Content $f.FullName -Raw
    
    if ($content -notmatch 'users\.html') {
        $newContent = $content -replace '(<a href="reports\.html" class="nav-link"[^>]*>.*?Reports</a>)', "`$1`r`n                <a href=""users.html"" class=""nav-link""><i class=""fas fa-user-friends""></i> Users</a>"
        if ($content -ne $newContent) {
            Set-Content -Path $f.FullName -Value $newContent -NoNewline
            Write-Host "Added Users link to: $($f.Name)"
        }
    } else {
        Write-Host "Already has Users link: $($f.Name)"
    }
}
