# Usando este projeto com o Claude Code

## O que já está pronto
- App React completo (Modo Expressão, Lista de Exercícios, Modo Simples, captura de foto via Gemini)
- Build testado e validado — compila 100% limpo
- `package.json`, Tailwind configurado, `.gitignore` protegendo a chave

## Passo a passo

**1. Descompacte este zip** numa pasta no seu computador, ex: `~/projetos/matrix-calculator`

**2. Abra o terminal nessa pasta e chame o Claude Code:**
```bash
cd matrix-calculator
claude
```

**3. Peça pra ele fazer o setup e subir pro GitHub + Vercel.** Cole algo assim:

```
Este é um projeto React já pronto (Matrix Calculator). Preciso que você:
1. Rode `npm install` e confirme que `npm run build` passa sem erro
2. Inicialize um repositório git, faça o commit inicial
3. Crie um repositório novo no GitHub (posso autenticar via gh CLI) e suba o código
4. Configure o deploy no Vercel conectado a esse repositório do GitHub
5. Não suba a chave da API — ela vai como variável de ambiente GEMINI_API_KEY (sem prefixo
   REACT_APP_, usada só pela serverless function em api/gemini.js), configurada direto no
   painel do Vercel, não no código
```

**4. Se o Claude Code perguntar sobre a chave do Gemini**, você mesmo cola ela quando ele pedir pra configurar a variável de ambiente — nunca peça pra ele "adivinhar" ou usar uma chave de exemplo.

## Por que isso resolve o problema de permissão

O erro que você teve no Vercel (`you don't have permission to create a Deployment`) 
geralmente acontece com deploy manual (upload direto de arquivo/API) em contas com 
certas configurações de time. 

**Conectar via GitHub é o caminho recomendado pelo próprio Vercel** e costuma contornar 
essa restrição, porque o deploy passa a ser acionado pelo GitHub (push → build → deploy) 
em vez de upload direto. O Claude Code, tendo acesso ao terminal e ao `gh` (GitHub CLI) 
e ao `vercel` (Vercel CLI) se você tiver instalado, consegue fazer esse fluxo completo 
sem essa trava.

## Se o Claude Code perguntar sobre autenticação
- **GitHub:** ele vai pedir pra rodar `gh auth login` — você segue o fluxo no navegador
- **Vercel:** ele vai pedir `vercel login` — mesma coisa, autentica no navegador

## Referência: estrutura do projeto
```
matrix-calculator/
├── src/
│   ├── App.jsx       ← app inteiro (calculadora + exercícios + foto)
│   ├── index.js
│   └── index.css
├── public/
│   └── index.html
├── package.json
├── tailwind.config.js
├── postcss.config.js
├── .env.example       ← modelo (NÃO tem chave real)
├── .gitignore          ← protege .env de ir pro git
└── DEPLOY.md           ← guia manual (caso queira fazer sem Claude Code)
```
