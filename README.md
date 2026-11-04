# Cidade Geotécnica

Cidade 3D animada com obras geotécnicas, cada uma com uma vista em corte e a sequência de execução animada.
Three.js + Vite, sem backend. Interface em português do Brasil.

## Rodar no seu computador
Precisa do Node.js 18 ou mais novo.

    npm install
    npm run dev          # http://localhost:5173

## Gerar um arquivo único (abre offline)
    npm run artifact     # cria artifact/cidade-geotecnica.html

Abrir `index.html` direto no navegador não funciona: o código usa módulos e precisa do servidor do Vite.

## Como a cidade se organiza
A cidade é dividida em zonas, cada uma com um tema:

| Zona | Tema | Obras animadas em corte |
|------|------|-------------------------|
| A | Túneis | A1, A2, A5 |
| B | Fundação direta | B1 a B6 |
| C | Fundação profunda | C1, C2, C3, C4, C6, C7, C13, C14 |
| D | Escavações e contenções | D1 a D8, D10, D11, D14 |
| E | Vias e pavimentos | E1, E2, E4, E5, E6 |
| F | Obras de terra e encostas | F1 a F5 |
| G | Investigação e ensaios | em breve |
| H | Barragens e rejeitos | em breve |

O planejamento completo, as decisões e o histórico de versões estão em [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Estrutura do código
    src/main.js            monta a cena, as obras e a interface
    src/scene/             motor (câmera, corte, terreno, ciclo dia/noite)
    src/kit/               máquinas e peças reutilizáveis
    src/life/              carros, pessoas e árvores
    src/zones/             uma ou mais obras por arquivo (a1 ... f*)
    src/zones/fprofile.js  motor de perfil das obras de terra (zona F)
    src/ui/                menus, painel de etapas e rótulos
    src/data/catalogo.json catálogo das obras
    scripts/               capturas de tela e testes automatizados (Playwright)

## Como uma obra é montada
Cada obra expõe `{ group, state, anchors, update(dt, t), labelVis(k), enter(), exit() }` e é registrada em
`src/ui/ui.js` (`CORTE`) com a caixa do corte, a câmera, as etapas, os rótulos e os textos.
Para ver a obra: escolha a zona e clique no botão da obra.
