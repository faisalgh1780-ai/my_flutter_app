# PowerShell script to create or update repository labels using GitHub CLI (gh)
# Usage: run in repo root with GitHub CLI authenticated (gh auth login)

$labels = @(
  @{name='feature'; color='0e8a16'; desc='New feature or enhancement'},
  @{name='bugfix'; color='d73a4a'; desc='Bug or defect'},
  @{name='chore'; color='006b75'; desc='Maintenance tasks'},
  @{name='docs'; color='0075ca'; desc='Documentation changes'},
  @{name='security'; color='b60205'; desc='Security related'}
)

foreach ($lbl in $labels) {
  $name = $lbl.name
  $color = $lbl.color
  $desc = $lbl.desc

  gh label view $name > $null 2>&1
  if ($LASTEXITCODE -eq 0) {
    gh label edit $name --color $color --description "$desc"
    Write-Output "Updated label: $name"
  } else {
    gh label create $name --color $color --description "$desc"
    Write-Output "Created label: $name"
  }
}
