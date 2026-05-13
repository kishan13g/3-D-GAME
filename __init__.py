# __init__.py files
New-Item -ItemType File pick3_game\__init__.py
New-Item -ItemType File accounts\__init__.py
New-Item -ItemType File bets\__init__.py
New-Item -ItemType File wallet\__init__.py

# admin.py files
New-Item -ItemType File accounts\admin.py
New-Item -ItemType File bets\admin.py
New-Item -ItemType File wallet\admin.py

# apps.py files
New-Item -ItemType File accounts\apps.py
New-Item -ItemType File bets\apps.py
New-Item -ItemType File wallet\apps.py

# draws folder (settings mein hai)
New-Item -ItemType Directory draws
New-Item -ItemType File draws\__init__.py
New-Item -ItemType File draws\apps.py
New-Item -ItemType File draws\urls.py