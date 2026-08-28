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

A chave é usada só pela serverless function (`api/gemini.js`), do lado do servidor — nunca pelo navegador. Por isso, **não** use restrição por domínio/website (ela bloquearia as chamadas, já que não vêm mais de um navegador). Restrinja só por API:

1. Vai em [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
2. Clica na sua chave da API
3. Em **"API restrictions"** → restringe pra só **"Generative Language API"**
4. Salva

Isso já limita o dano se a chave vazar por outro caminho (ela não fica exposta no código do navegador, então o principal vetor de vazamento nem existe).

---

## Passo 4 — Adiciona a chave no Vercel

**Antes de clicar em Deploy:**

1. Na tela de criação do projeto, expande **"Environment Variables"**
2. Adiciona:
   - **Name:** `GEMINI_API_KEY`
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
- A variável de ambiente está com o nome EXATO `GEMINI_API_KEY`
- Você fez redeploy depois de adicionar a variável (variáveis não retroagem pra deploys antigos)
- A chave não está com restrição de domínio errada

---

## ✅ Nota sobre segurança

A chave **não** fica exposta no código do navegador: o app chama `/api/gemini`, uma serverless function do próprio Vercel (`api/gemini.js`) que guarda `GEMINI_API_KEY` só no servidor e repassa a chamada pro Gemini por trás. Por isso a variável não leva o prefixo `REACT_APP_` — se levasse, o Create React App a embutiria no bundle público do navegador.

---

## Referência rápida

| O quê | Onde |
|---|---|
| Pegar chave Gemini | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| Restringir chave | [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials) |
| Deploy | [vercel.com](https://vercel.com) |
| Nome exato da variável | `GEMINI_API_KEY` |
