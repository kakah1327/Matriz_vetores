# 🚀 Deploy no Vercel — Passo a Passo

## O que você precisa ter em mãos
- [ ] Conta no GitHub (grátis)
- [ ] Conta no Vercel (grátis, dá pra logar com GitHub)
- [ ] Sua chave da API do Google Gemini ([console.cloud.google.com](https://console.cloud.google.com) ou [aistudio.google.com/apikey](https://aistudio.google.com/apikey))

---

## Passo 1 — Sobe o código pro GitHub

```bash
cd matrix-calculator
git init
git add .
git commit -m "Matrix Calculator - primeira versão"
```

No GitHub: cria um repositório novo (ex: `matrix-calculator`), depois:

```bash
git remote add origin https://github.com/SEU-USUARIO/matrix-calculator.git
git branch -M main
git push -u origin main
```

⚠️ **Confere que o `.gitignore` subiu junto** — ele impede o `.env` (se você criar um local) de ir pro GitHub por engano.

---

## Passo 2 — Conecta no Vercel

1. Entra em [vercel.com](https://vercel.com) → Sign in com GitHub
2. Clica **"Add New..."** → **"Project"**
3. Seleciona o repositório `matrix-calculator`
4. O Vercel detecta sozinho que é Create React App — **não precisa mexer em nada** nas configurações de build

---

## Passo 3 — Restringir a chave (segurança, antes de fazer deploy)

Antes de colar a chave no Vercel, restringe ela no Google Cloud pra só funcionar no seu domínio:

1. Vai em [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
2. Clica na sua chave da API
3. Em **"Application restrictions"** → escolhe **"Websites"**
4. Adiciona os domínios:
   ```
   https://*.vercel.app/*
   https://matrix-calculator-seu-usuario.vercel.app/*
   ```
   *(o domínio exato você só sabe depois do primeiro deploy — pode voltar aqui e ajustar depois)*
5. Em **"API restrictions"** → restringe pra só **"Generative Language API"**
6. Salva

Isso impede que, mesmo se alguém pegar sua chave olhando o código do navegador, ela funcione fora do seu site.

---

## Passo 4 — Adiciona a chave no Vercel

**Antes de clicar em Deploy:**

1. Na tela de criação do projeto, expande **"Environment Variables"**
2. Adiciona:
   - **Name:** `REACT_APP_GEMINI_API_KEY`
   - **Value:** *(cola sua chave aqui)*
3. Clica **"Add"**
4. Agora sim, clica **"Deploy"**

Se você já tinha feito deploy antes de configurar a variável: vai em **Project Settings → Environment Variables**, adiciona lá, depois em **Deployments** → clica nos 3 pontinhos do último deploy → **Redeploy**.

---

## Passo 5 — Testa

Depois do deploy (leva ~1-2 min), o Vercel te dá uma URL tipo:
```
https://matrix-calculator-seu-usuario.vercel.app
```

Abre, testa o botão de câmera com uma foto de matriz. Se der erro de API, confere:
- A variável de ambiente está com o nome EXATO `REACT_APP_GEMINI_API_KEY`
- Você fez redeploy depois de adicionar a variável (variáveis não retroagem pra deploys antigos)
- A chave não está com restrição de domínio errada

---

## ⚠️ Nota importante sobre segurança

Mesmo com a chave restrita por domínio, ela ainda fica **visível no código do navegador** (F12 → Network ou Sources) pra qualquer um que abrir seu site. A restrição de domínio impede que **funcione** fora do seu site, mas não impede que apareça.

Pra um projeto de portfólio/faculdade isso é aceitável. Se um dia você quiser algo mais robusto (ex: o site for usado por muita gente e você quiser controlar custo/abuso), o caminho é criar uma **serverless function** no próprio Vercel que guarda a chave no servidor e nunca expõe ela no front — aí sim ninguém vê a chave. Posso te ajudar com isso depois se precisar.

---

## Referência rápida

| O quê | Onde |
|---|---|
| Pegar chave Gemini | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| Restringir chave | [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials) |
| Deploy | [vercel.com](https://vercel.com) |
| Nome exato da variável | `REACT_APP_GEMINI_API_KEY` |
