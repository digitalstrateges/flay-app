# Flay - Deploy Guide (Gratuit)

## Option 1: Railway (Recommande - le plus simple)

### Etape 1: Creer un compte Railway
1. Va sur https://railway.app
2. Connecte ton compte GitHub
3. Clique "New Project" > "Deploy from GitHub repo"

### Etape 2: Push le code sur GitHub
```bash
cd /root/Flay
git init
git add .
git commit -m "Flay v3.0 - Production"
git remote add origin https://github.com/TON_USERNAME/flay-app.git
git push -u origin main
```

### Etape 3: Railway auto-detecte Node.js
- Railway lit automatiquement le `package.json`
- Le `Procfile` dit a Railway de lancer `node server.js`
- Le port est auto-detecte via `process.env.PORT`

### Etape 4: Variables d'environnement (dans Railway Dashboard)
```
NODE_ENV=production
JWT_SECRET=ton-secret-ici
SESSION_SECRET=ton-session-ici
```

### Etape 5: Domaine gratuit
- Railway donne un domaine: `flay-app.up.railway.app`
- Tu peux connecter un domaine perso gratuit via Freenom (.tk/.ml)

**COUT: 0€/mois** (5$ de credit inclus)

---

## Option 2: Render (Alternative gratuite)

### Etape 1: Creer un compte Render
1. Va sur https://render.com
2. Connecte GitHub
3. "New" > "Web Service"

### Etape 2: Configuration
- **Name**: flay-app
- **Runtime**: Node
- **Build Command**: `npm install` (ou rien)
- **Start Command**: `node server.js`
- **Plan**: Free

### Etape 3: Variables d'environnement
Meme chose que Railway.

**COUT: 0€/mois** (limites: 750h/mois, spin down apres 15min d'inactivite)

---

## Option 3: Cyclic.sh (Alternative)

1. Va sur https://cyclic.sh
2. Connecte GitHub
3. Deploy automatique

**COUT: 0€/mois**

---

## Pour gagner de l'argent avec Flay

### Comment ca marche
1. **Inscription gratuite** → Les utilisateurs creent leur profil
2. **Upgrade Pro (5 000 FCFA/mois)** → Plus de services, analytics, reservation
3. **Upgrade Premium (15 000 FCFA/mois)** → Tout illimite + domaine perso
4. **Paiement Wave** → Lien Wave direct vers ton compte

### Ton compte Wave
```
https://pay.wave.com/m/M_uv5jVAEPkSWs/c/ci/
Titulaire: DIGITALSTRATEGE BUSINESS
```

### Comment attirer des clients
1. **Partage sur WhatsApp** → Envoie le lien a tes contacts
2. **Facebook/Instagram** → Publie des photos avant/apres
3. ** Bouche-a-oreille** → Demande a chaque client de recommander
4. **Tarif**: 5 000 FCFA/mois c'est accessible pour tous

### Estimation de revenus
| Clients | Plan Pro | Plan Premium | Total/mois |
|---------|----------|--------------|------------|
| 10      | 50 000   | 0            | 50 000 FCFA |
| 20      | 50 000   | 150 000      | 200 000 FCFA |
| 50      | 100 000  | 300 000      | 400 000 FCFA |

### URL en ligne
Une fois deploye, ton URL sera:
- Railway: `https://flay-app.up.railway.app`
- Render: `https://flay-app.onrender.com`
- Cyclic: `https://xxx.cyclic.app`
