# 🏗️ Cidade Geotécnica 3D — Roadmap e Planejamento

> Nome provisório. Versão 3.16 · 06/11/2026
> Status: **Fase 1b em andamento**, com 52 obras animadas em corte: Zona A (A1, A2, A5), B (B1 a B6), C (C1, C2, C3, C4, C6, C7, C13, C14), D (D1 a D8, D10, D11, D14), E (E1, E2, E4, E5, E6), F (F1 a F5), **G (G1 a G12)** e H (H1, H4). Falta você confirmar as sequências e os valores de exemplo.
> Publicação: site em https://victortlacerda.github.io/cidade-geotecnica/, atualizado sozinho a cada envio para a `main` (GitHub Actions).

---

## Como usar este documento

1. Marque `[x]` no que você concorda ou já está decidido.
2. Nas **Decisões (seção 5)**, escreva sua escolha em `Sua resposta:`. Concordou com a minha recomendação? Escreva "ok".
3. Trabalhamos **uma zona por vez** (seção 6). Hoje o foco é a **Zona A — Túneis** (seção 4).
4. Me devolva o arquivo. Eu atualizo, registro no **Log de decisões (seção 11)** e avançamos.
5. Ideia nova? Coloque na **seção 3 (Banco de ideias)**. Nada se perde, mesmo que fique para depois.

---

## 0. Painel de andamento

| Zona | Catálogo confirmado | Fichas das obras | Modelagem | Animação | Revisão |
|------|:---:|:---:|:---:|:---:|:---:|
| A — Túneis | [x] | [ ] (rascunho na seção 4, falta confirmar as sequências) | [ ] | [ ] | [ ] |
| B — Fundação direta | [x] | [ ] | [ ] | [ ] | [ ] |
| C — Fundação profunda | [x] | [ ] | [ ] | [ ] | [ ] |
| D — Escavações e contenções | [x] | [ ] | [ ] | [ ] | [ ] |
| E — Vias e pavimentos | [x] | [ ] | [ ] | [ ] | [ ] |
| F — Obras de terra e encostas | [x] | [ ] | [ ] | [ ] | [ ] |
| G — Investigação e ensaios | [x] | [ ] | [ ] | [ ] | [ ] |
| H — Barragens e rejeitos | [x] | [ ] | [ ] | [ ] | [ ] |

---

## 1. Visão do produto

Um aplicativo web com uma **cidade 3D animada**, onde várias obras geotécnicas acontecem ao mesmo tempo, com máquinas, operários e veículos em movimento. Ao **clicar em uma obra**, abre-se um **repositório de estudo** com as referências que o próprio usuário adiciona: links (Google Drive, YouTube), vídeos, artigos, documentos, fotos e áudios.

**Princípios**

- **Zero custo de armazenamento em nuvem**: nenhum arquivo do usuário sobe para servidor meu.
- **O app guarda só referências** (links e caminhos). Arquivos pesados ficam no computador do usuário ou no Drive/YouTube dele.
- **Prático, bonito e agradável de usar**: design e UX são requisitos, não enfeite.
- **Planejar primeiro, animar depois, funcionalidade por último.**
- **Uma zona por vez**: você confirma, eu modelo, revisamos, e só então a próxima.

**Referências visuais:** *Cities: Skylines* (câmera livre, cidade viva) e os dois vídeos que você enviou (seção 9). **Diferencial nosso: vista em corte do subsolo** em cada obra.

---

## 2. Catálogo de obras

### 2.1 Como a cidade se organiza

```
Cidade → Zona (bairro temático) → Obra (variante clicável) → Repositório
```

As oito zonas: **A Túneis · B Fundação direta · C Fundação profunda · D Escavações e contenções · E Vias e pavimentos · F Obras de terra e encostas · G Investigação e ensaios · H Barragens e disposição de rejeitos.**

- Cada **obra** é uma variante específica (ex.: "Sapata corrida") e tem seu próprio repositório.
- Cada **zona** tem também um **repositório geral** (ex.: referências de "fundação profunda" valem para todas as estacas).
- **Casa x prédio deixou de ser zona e virou contexto.** Como as zonas agora são por tipo de fundação, a mesma obra pode aparecer com uma casa ou com um prédio em cima. A coluna **Contexto** mostra isso (DEC16).

**Mapa da cidade (v3.14).** Do lado de cá do rio: na fileira de trás, **A ampliada** (cresceu para a direita, sem a rua entre as partes, com pátio de aduelas, um segundo poço e grua), **Zona E** (trecho de trás da avenida central, de 16 m, onde ficam as obras E1, E2, E4, E5 e E6, mais uma faixa ao lado com usina de asfalto e pátio de agregados) e **D ampliada** (dois lotes, platô com cortina atirantada e ensecadeira de estacas-prancha); na fileira da frente, B, **C deitada** (dois lotes contínuos, do lote original da C ao antigo lote de E, com um canteiro de fundações profundas: prédio em estrutura com grua, cravação de estacas, hélice contínua e tubulão) e G. A avenida central termina em T na rua do meio, para a C não ser cortada. Do outro lado do rio: F e H, **Zona I (Geotecnia ambiental)** no canto esquerdo, com o aterro sanitário ao lado da saída do túnel (os caminhões de lixo chegam pelo túnel), e **Zona J (Pontes e obras em rio)** no canto direito, na chegada da ponte: a própria ponte, uma **ensecadeira** de estacas-prancha no rio ao lado dela (água bombeada para fora, bloco de um novo pilar a seco, guindaste na margem) e um pátio de vigas pré-moldadas com pórtico.
- Zona J, obras: **J1 Ponte com fundação em rio** (era a C17) e **J2 Ensecadeira**, as duas P1. Pendente: tipo de fundação dos pilares (tubulão a ar comprimido, estaca escavada com camisa ou estaca cravada), se a J1 mostra a ensecadeira como etapa, e outras obras para a zona (proteção de margens, dragagem).

**J2 Ensecadeira (v3.16, animada em corte).** Seção em x = 95, cortando o rio de margem a margem pelo meio do recinto (ao lado da ponte). 1 Balsa com guindaste e gabarito de cravação → 2 Estacas-prancha cravadas com martelo vibratório até 6,8 m abaixo do leito (ficha) → 3 Escavação do fundo sob água com clamshell (2,3 m abaixo do leito) e selo de concreto submerso pelo tubo tremonha (1,5 m) → 4 Esgotamento pela bomba, com dois quadros de escoras entrando à medida que o nível desce, setas da pressão da água nas paredes e da subpressão sob o selo, e um quadro com o equilíbrio do selo → 5 Bloco de coroamento e pilar a seco → 6 Inundação, retirada das escoras de baixo para cima e extração das estacas.
- Valores adotados (exemplo, não é de projeto): rio com 2,9 m de lâmina d'água, recinto de 10 × 6 m, coluna d'água de 5,2 m até o fundo do selo, subpressão de 51 kPa, peso do selo de 36 kPa e 15 kPa resistidos pela aderência às estacas. Pendente: se prefere selo mais espesso (sem contar com a aderência) ou ancorado com estacas, a verificação de sifonamento pela ficha, e se a J1 deve repetir a ensecadeira ou começar com ela pronta.
- Zona I, obras sugeridas (confirme): I1 Aterro sanitário (P1), I2 Remediação de área contaminada, I3 Poços de monitoramento da água subterrânea (P2), I4 Cobertura final e encerramento de aterro, I5 Tratamento de chorume (P3).

**Mapa da cidade (v3.12).** Um rio corre atrás da cidade, ao longo de toda a borda do fundo. Do lado de cá ficam A, D (fundo) e B, C, E, G (frente); os antigos lotes de F e H viraram quarteirões de prédios e uma praça. Do outro lado do rio fica a **área afastada**, com as zonas **F** (encosta) e **H** (vale da barragem e pilha de rejeitos), mais mata e morros nos cantos. Dois acessos ligam as margens:
- **Túnel** (Zona A): o NATM do emboque segue para o norte, passa por baixo da rua do fundo e do rio (traçado tracejado sobre a água e poços de ventilação nas margens) e sai num portal na face norte de uma colina, na área afastada, com acesso até a rua do fundo.
- **Ponte** (perto da Zona D): tabuleiro com rampas, dois pilares duplos sobre blocos no leito do rio, encontros nas margens, guarda-corpo, postes e trânsito em mão dupla. É a ponte da futura obra **C17 (fundação de ponte em rio)**.
- Pendente: se a ponte deve ser mais alta (hoje o tabuleiro fica a 1,4 m da rua, para caber no diorama), se o túnel deve aparecer em corte sob o rio, e se a C17 entra agora (fundação de um dos pilares sendo executada na água).

### 2.2 Termos que entendi (confirme, pois veio de áudio)

| Você disse | Entendi como | Confere? |
|-----------|--------------|----------|
| sapato / sapato corrido / sapato de divisa | sapata / sapata corrida / sapata de divisa (com viga de equilíbrio) | [ ] |
| tacos cavados (casa e prédio) | tubulões escavados | [ ] |
| casa com estaca escavada | estaca broca | [ ] |
| prédio mais contínuo | estaca hélice contínua | [ ] |
| remoldado | estaca pré-moldada (cravada) | [ ] |
| metálica | estaca metálica | [ ] |
| TBM / NATM | tuneladora / método convencional com concreto projetado | [ ] |
| estacas escavadastrado mecanizado | estacas escavadas com trado mecanizado | [ ] |
| muro de arrimo de bloco cheio | muro por gravidade em alvenaria de blocos de concreto preenchidos com graute | [ ] |
| estaca tipo Ômega | estaca de deslocamento (ferramenta que empurra o solo para os lados, sem retirá-lo) | [ ] |
| barragens e pilhas de rejeitos | barragens de terra/enrocamento e pilhas de rejeito (e talvez barragens de rejeito) | [ ] |

### 2.3 Lista de obras

Legenda. **Origem:** ✅ você citou (na conversa ou no checklist) · 💡✔ sugestão minha que você confirmou. **IDs são fixos**: obras retiradas não têm o ID reaproveitado (seção 2.5). `[ ]` = ainda não modelada. **P** = prioridade dentro da zona (1 = fazer agora, 2 = depois, 3 = futuro); os valores de P são sugestão, mude à vontade. **(fenômeno)** = o tema é um comportamento do solo e não uma obra a construir; a animação mostra o problema acontecendo (chuva, infiltração, recalque, levantamento) e, se couber, a solução.

**Zona A — Túneis** (detalhada na seção 4)

| Obra | Origem | Ideia da animação | Corte (subsolo) | P |
|------|--------|-------------------|-----------------|---|
| [ ] A1 Túnel TBM (tuneladora) | ✅ | Cabeça de corte girando, aduelas, correia de bota-fora | Frente, escudo, anéis, solo e lençol | 1 |
| [ ] A2 Túnel NATM | ✅ | Escavação em avanço, concreto projetado, cambotas | Seções de avanço, revestimento primário | 1 |
| [ ] A5 Emboque / portal em encosta | 💡✔ | Contenção do portal, escavação inicial | Maciço e cobertura sobre o túnel | 3 |

**Zona B — Fundação direta**

| Obra | Origem | Contexto | Ideia da animação | Corte (subsolo) | P |
|------|--------|----------|-------------------|-----------------|---|
| [x] B1 Sapata isolada | ✅ | casa / prédio | Forma, armação, betoneira | Sapata, pilar, bulbo de tensões | 2 |
| [x] B2 Sapata corrida | ✅ | casa | Vala, armação, concretagem | Faixa contínua sob paredes | 1 |
| [x] B3 Sapata de divisa (viga de equilíbrio) | ✅ | casa / prédio | Obra junto ao muro do vizinho | Sapata excêntrica + viga alavanca | 2 |
| [x] B4 Radier | ✅ | casa / prédio | Compactação, armação, concretagem da laje | Laje sobre o solo, camada de brita | 1 |
| [x] B5 Sapata associada | ✅ | prédio | Armação de sapata para dois pilares | Sapata comum, pilares próximos | 2 |
| [x] B6 Melhoria do solo sob fundação rasa | 💡✔ | casa | Troca de solo, colchão de brita, compactação | Camadas substituídas | 3 |

**Zona C — Fundação profunda**

| Obra | Origem | Contexto | Ideia da animação | Corte (subsolo) | P |
|------|--------|----------|-------------------|-----------------|---|
| [x] C1 Estaca broca (manual) | ✅ (confirmar) | casa | Trado manual ou perfuratriz leve, concretagem | Estacas e blocos em solo | 2 |
| [x] C2 Tubulão a céu aberto | ✅ | casa / prédio | Escavação, camisa, alargamento da base | Fuste, base alargada, camada resistente | 2 |
| [x] C3 Estaca escavada com trado mecanizado | ✅ | casa grande / prédio | Perfuratriz com trado, concretagem com tremonha | Estaca escavada sem fluido | 2 |
| [x] C4 Estaca hélice contínua | ✅ | prédio | Perfuratriz com hélice, bomba de concreto, armadura descendo | Concretagem durante a retirada da hélice | 1 |
| [ ] C5 Estaca ômega | ✅ | prédio | Ferramenta de deslocamento girando, sem retirar solo | Solo empurrado para os lados | 3 |
| [x] C6 Estaca pré-moldada de concreto (cravada) | ✅ | prédio | Bate-estaca, emendas | Penetração até a nega | 2 |
| [x] C7 Estaca metálica | ✅ | prédio | Cravação de perfis, solda de emenda | Perfil no solo, ponta em solo duro ou rocha | 2 |
| [ ] C8 Estaca de trilho metálico | ✅ | casa / reforço | Cravação de trilhos reaproveitados com martelo leve | Trilho na camada resistente | 3 |
| [ ] C9 Estaca helicoidal | ✅ | casa leve / estruturas leves | Máquina girando a estaca como um parafuso | Hélices no solo | 3 |
| [ ] C10 Estaca raiz | ✅ | prédio / reforço | Perfuratriz com revestimento, injeção | Estaca em solo e rocha | 3 |
| [ ] C11 Estaca Strauss | ✅ | casa / pequeno porte | Tripé com piteira e revestimento | Estaca com tubo recuperável | 3 |
| [ ] C12 Estaca Franki | ✅ | prédio | Pilão e tubo cravado, base alargada | Bulbo de base | 3 |
| [x] C13 Estaca escavada / barrete / estacão | 💡✔ | prédio alto | Clamshell, lama bentonítica | Estaca profunda | 3 |
| [x] C14 Bloco de coroamento | ✅ | prédio | Arrasamento das estacas, armação e concretagem do bloco | Estacas ligadas ao bloco e ao pilar | 2 |
| [ ] C15 Radier estaqueado | ✅ | prédio | Estacas + radier | Interação radier-estacas | 3 |
| ~~C17 Ponte com fundação em rio~~ | | | Movida para a Zona J como **J1** (v3.15); o ID C17 não é reaproveitado | | |

**Zona D — Escavações e contenções**

| Obra | Origem | Ideia da animação | Corte (subsolo) | P |
|------|--------|-------------------|-----------------|---|
| [x] D1 Escavação urbana com cortina de estacas | ✅ | Escavadeira, caminhões, trânsito ao redor | Estacas, solo, edifícios vizinhos | 1 |
| [x] D2 Cortina de estacas secantes | ✅ | Estacas alternadas (primárias e secundárias) e escavação revelando a parede | Estacas que se interceptam, parede estanque | 2 |
| [x] D3 Cortina de estacas tangentes | ✅ | Estacas lado a lado e escavação | Estacas encostadas, frestas entre elas | 2 |
| [x] D4 Cortina em balanço | ✅ | Escavação rasa com cortina sem apoio | Embutimento da cortina e empuxo | 2 |
| [x] D5 Cortina atirantada | ✅ | Perfuração e protensão de tirantes | Tirantes ancorados no solo | 1 |
| [x] D6 Parede diafragma | ✅ | Clamshell, lama, gaiola de armação | Painéis e lençol freático | 2 |
| [x] D7 Solo grampeado | ✅ | Perfuração, grampos, concreto projetado | Face e grampos | 2 |
| [x] D8 Muro de arrimo por gravidade | ✅ | Execução do muro e reaterro | Peso próprio, empuxo, dreno | 2 |
| [ ] D9 Muro de arrimo de bloco cheio | ✅ (confirmar o termo) | Assentamento dos blocos, graute, reaterro | Alvenaria de blocos cheios e dreno | 3 |
| [x] D10 Muro de arrimo por flexão | ✅ | Armação em L, forma, concretagem, reaterro compactado | Laje de base, cortina, dreno | 2 |
| [x] D11 Muro de gabião | ✅ | Montagem das gaiolas, enchimento com pedras | Gaiolas empilhadas, geotêxtil, dreno | 2 |
| [ ] D12 Estaca prancha | 💡✔ | Vibrocravação | Perfis encaixados | 3 |
| [x] D14 Vala urbana escorada (redes de água e esgoto) | ✅ | Escoramento, assentamento de tubo, trânsito desviado | Vala e escoras | 2 |
| [ ] D15 Rebaixamento do lençol freático | ✅ | Ponteiras, bombas, descarga | Cone de rebaixamento | 3 |

**Zona E — Vias e pavimentos**

| Obra | Origem | Ideia da animação | Corte (subsolo) | P |
|------|--------|-------------------|-----------------|---|
| [x] E1 Pavimento asfáltico (flexível) | ✅ | Motoniveladora, rolo, espalhadora, caminhões | Subleito, sub-base, base, revestimento | 1 |
| [x] E2 Pavimento de concreto (rígido) | 💡✔ | Pavimentadora de formas deslizantes, juntas | Placas sobre sub-base | 2 |
| [x] E4 Estrada com corte e aterro | ✅ | Terraplenagem, trator, caminhões | Greide e taludes | 2 |
| [x] E5 Reforço de pavimentos | ✅ | Fresagem, recapeamento, rolo | Camada nova sobre a existente | 2 |
| [x] E6 Geossintéticos em pavimentos | ✅ | Instalação de geogrelha ou geotêxtil sob a base | Geossintético entre camadas | 2 |
| [ ] E7 Drenagem viária (bueiros, galerias) | 💡✔ | Vala, tubos, reaterro | Rede enterrada | 3 |
| [ ] E8 Estabilização / reforço de subleito | 💡✔ | Misturador, cal ou cimento | Camada tratada | 3 |

**Zona F — Obras de terra e encostas**

| Obra | Origem | Ideia da animação | Corte (subsolo) | P |
|------|--------|-------------------|-----------------|---|
| [x] F1 Estabilidade de taludes e encostas (fenômeno) | ✅ | Chuva, infiltração e movimento de massa; depois grampeamento e drenos | Superfície de ruptura e fator de segurança | 2 |
| [x] F2 Cortes em solo e rocha | ✅ | Escavadeira, trator, caminhões; bancadas e bermas | Talude de corte, camadas | 2 |
| [x] F3 Aterros | ✅ | Lançamento, espalhamento e compactação por camadas | Camadas e controle | 2 |
| [x] F4 Aterros sobre solos moles | ✅ | Instalação de drenos verticais, sobrecarga, recalques ao longo do tempo | Adensamento e recalques | 2 |
| [x] F5 Compactação de solos | ✅ | Rolos (liso, pé de carneiro, vibratório), controle de umidade e densidade | Camadas, índice de vazios e curva de compactação | 1 |
| [ ] F6 Solos colapsíveis (fenômeno) | ✅ | Vazamento ou chuva molhando o solo e a casa assentando de repente | Solo poroso, entrada de água, colapso | 3 |
| [ ] F7 Solos expansivos (fenômeno) | ✅ | Umedecimento e secagem, laje e paredes levantando e trincando | Argila expansiva e zona ativa | 3 |
| [ ] F9 Drenagem em obras de terra | 💡✔ | Valetas, drenos de brita e geotêxtil, drenos horizontais | Caminho da água no maciço | 3 |

**Zona G — Investigação e ensaios**

| Obra | Origem | Ideia da animação | Corte (subsolo) | P |
|------|--------|-------------------|-----------------|---|
| [x] G1 Sondagem SPT | ✅ | Equipe com tripé e martelo | Perfil de sondagem e NSPT | 2 |
| [x] G2 Sondagem rotativa | 💡✔ | Sonda rotativa, testemunhos de rocha | Perfil de rocha e RQD | 3 |
| [x] G3 Ensaio CPT | ✅ | Cravação hidráulica da ponteira | Curvas de resistência | 3 |
| [x] G4 Ensaio CPTU (piezocone) | ✅ | Cravação com medida de poropressão | Resistência e poropressão por profundidade | 3 |
| [x] G5 Vane test (ensaio de palheta) | ✅ | Palheta girando em argila mole | Resistência não drenada da argila | 3 |
| [x] G6 Ensaio de placa | ✅ | Placa carregada no fundo da cava | Bulbo de tensões | 3 |
| [x] G7 Prova de carga estática (PCE) | ✅ | Macaco hidráulico, reação, relógios | Curva carga x recalque | 3 |
| [x] G8 Ensaio dinâmico em estacas (PDA) | ✅ | Martelo e sensores na estaca | Ondas de tensão na estaca | 3 |
| [x] G9 Ensaio de integridade (PIT) | ✅ | Martelo leve e sensor na cabeça da estaca | Onda refletida em defeitos | 3 |
| [x] G10 Monitoramento de recalques de fundações | ✅ | Topógrafo lendo marcos, gráfico crescendo | Recalque ao longo do tempo | 3 |
| [x] G11 Piezômetros | ✅ | Técnico lendo o nível d'água | Poropressão e nível d'água no maciço | 3 |
| [x] G12 Inclinômetros e instrumentação geral | 💡✔ | Técnico descendo a sonda no tubo | Deslocamentos no maciço | 3 |
| [ ] G13 Laboratório de geotecnia (edifício-ícone) | 💡✔ | Só um prédio pequeno com a placa "Laboratório", sem animação de obra; o clique abre o repositório de ensaios de laboratório | Sem corte (ensaios de laboratório, não de campo) | 3 |

**Zona H — Barragens e disposição de rejeitos** (zona nova)

| Obra | Origem | Ideia da animação | Corte (subsolo) | P |
|------|--------|-------------------|-----------------|---|
| [x] H1 Barragem (de terra) | ✅ (definir variantes) | Compactação em camadas, filtros, vertedouro, enchimento do reservatório | Núcleo, espaldares, filtro, linha de percolação | 1 |
| [ ] H2 Barragem de enrocamento | 💡✔ | Lançamento de enrocamento, face de concreto ou núcleo | Zonas de enrocamento e vedação | 3 |
| [ ] H3 Barragem de rejeitos (alteamentos) | 💡✔ | Disposição de rejeito e alteamento a montante, a jusante e por linha de centro | Rejeito, drenagem interna e nível freático | 3 |
| [x] H4 Pilha de rejeitos | ✅ | Caminhões, trator, compactação em bancos, drenos | Bancadas, drenagem interna e fundação | 2 |
| [ ] H5 Pilha de estéril | 💡✔ | Basculamento por caminhões, bancos | Bancos e fundação | 3 |
| [ ] H6 Vertedouro e drenagem interna de barragens | 💡✔ | Vertedouro em operação, filtros e drenos | Filtro, dreno de pé e fluxo | 3 |

**Resumo:** 73 obras no catálogo (A3 · B6 · C16 · D14 · E7 · F8 · G13 · H6). Não precisa fazer todas. O catálogo guarda tudo; você escolhe, zona a zona, o que entra em P1. Muitas obras de uma mesma zona compartilham o cenário, o corte e as máquinas (as estacas, por exemplo), então acrescentar uma variante costuma custar bem menos que a primeira.

### 2.4 Onde foi parar cada item do seu checklist

Nada ficou de fora. Itens marcados com `→` mudaram de lugar em relação ao seu checklist.

| Seção do seu checklist | Item → ID no catálogo |
|------------------------|-----------------------|
| 1. Fundações profundas — estacas | escavada com trado mecanizado → C3 · hélice contínua → C4 · pré-moldada → C6 · metálica → C7 · trilho metálico → C8 · raiz → C10 · Strauss → C11 · **secantes → D2** · **tangentes → D3** · helicoidais → C9 · Franki → C12 · Ômega → C5 |
| 2. Fundações superficiais e blocos | **blocos de coroamento → C14** · radier → B4 · **radier estaqueado → C15** · sapata isolada → B1 · sapata associada → B5 · sapata corrida → B2 · sapata de divisa → B3 |
| 3. Ensaios e investigação | monitoramento de recalques → G10 · PCE → G7 · PDA → G8 · PIT → G9 · ensaio de placa → G6 · CPT → G3 · CPTU → G4 · SPT → G1 · vane test → G5 |
| 4. Contenções | cortina atirantada → D5 · cortina em balanço → D4 · muro por gravidade → D8 · muro de bloco cheio → D9 · muro por flexão → D10 · gabião → D11 · parede diafragma → D6 · solo grampeado → D7 |
| 5. Estabilidade e obras de terra | taludes e encostas → F1 · cortes → F2 · aterros → F3 · aterros sobre solos moles → F4 · compactação → F5 · solos colapsíveis → F6 · solos expansivos → F7 |
| 6. Barragens e rejeitos | barragens → H1 · pilhas de rejeitos → H4 |
| 7. Drenagem e água subterrânea | **drenagem → F9 (obras de terra) e E7 (vias)** · rebaixamento do lençol → D15 · **piezômetros → G11** |
| 8. Túneis e escavações subterrâneas | TBM → A1 · NATM → A2 · escavações subterrâneas → **retirado a seu pedido** |
| 9. Pavimentação | pavimentação → E1 (flexível) e E2 (rígido) · reforço de pavimentos → E5 · geossintéticos → E6 |
| 10. Obras urbanas | valas urbanas → D14 |

**Onde coloquei diferente do seu checklist (aceito, sem objeção):**
- **Estacas secantes e tangentes** estão na seção de estacas no seu checklist, mas funcionam como **cortinas de contenção**, então ficaram na Zona D.
- **Blocos de coroamento** estão com as superficiais no seu checklist, mas só existem sobre estacas, então ficaram na Zona C.
- **Piezômetros** estão em "Drenagem" no seu checklist; ficaram na Zona G (instrumentação). **Drenagem** não virou zona; ficou espalhada em obras específicas.

### 2.5 Obras retiradas por você (ficam registradas)

Se mudar de ideia, voltam com o mesmo ID.

| ID | Obra | Motivo |
|----|------|--------|
| A3 | Escavações subterrâneas (cavernas e câmaras) | Não era o que você tinha em mente |
| A4 | Túnel em vala (cut-and-cover) | Retirada |
| A6 | Microtúnel / pipe jacking | Retirada |
| A7 | Poço de acesso / ventilação | Retirada |
| C16 | Tubulão a ar comprimido | Retirada |
| D13 | Cortina tipo Berlim | Retirada |
| E3 | Pavimento intertravado | Retirada |
| F8 | Muro de solo reforçado (geossintético) | Retirada |

---

## 3. Banco de ideias (nada se perde)

### Aceitas (entram no projeto)

- [x] Cidade 3D animada, rodando no navegador como aplicativo
- [x] Estilo visual inspirado em Cities: Skylines e nos dois vídeos (híbrido, DEC2)
- [x] Obras com "personagens" e a cidade funcionando
- [x] Clique na obra abre repositório de referências
- [x] Tipos de referência: link do Drive, YouTube, vídeo, artigo, documento, foto, áudio
- [x] Usuário faz o cadastro de cada referência
- [x] Sem servidor de armazenamento; arquivos ficam no computador do usuário
- [x] Catálogo completo de obras definido antes de desenvolver, em 8 zonas
- [x] Desenvolvimento por partes: confirmar uma zona, modelar, passar para a próxima
- [x] **Vista em corte do subsolo** em cada obra
- [x] **Cidade em cor neutra, obra ativa em cor**
- [x] **Temas "fenômeno"** (taludes, solos colapsíveis e expansivos): animar o problema acontecendo, com um botão para ver a solução
- [x] **Tour guiado por passos**
- [x] **Ciclo animado por etapas**, com a sequência definida por você (DEC5)
- [x] **Rótulos educativos (hotspots)**, podendo ter fotos
- [x] **Ciclo dia/noite**
- [x] **Anotações do usuário** em cada item
- [x] **Tags e busca** dentro do repositório
- [x] **Modo lista**, sem 3D, para celular
- [x] **PWA** (funcionar offline)
- [x] **Exportar a biblioteca** como uma lista organizada por temas e subitens, com todas as referências cadastradas (e também como JSON, para backup e para importar de volta)

### Para depois (v2, quando tudo estiver funcionando)

- [ ] Marcar item como "estudado" e mostrar progresso por obra e por zona

### Descartadas

- [x] ~~Comparar duas obras lado a lado~~

### Ainda sem resposta

- [ ] Biblioteca inicial de referências curadas por você (DEC12 recomenda; abra quando quiser)

**Estacionamento (ideias novas entram aqui)**

-
-

## 4. Zona A — Túneis

**Catálogo confirmado:** A1 Túnel TBM · A2 Túnel NATM · A5 Emboque / portal em encosta. Retiradas: A3, A4, A6, A7 (seção 2.5).

### 4.1 Como imagino a zona

Uma colina com o **portal** (A5) e o túnel **NATM** (A2) entrando nela, e, na parte plana ao lado, uma rua com prédios sobre o traçado do **TBM** (A1). As três obras ficam no mesmo bairro, então a câmera passa de uma para outra sem sair da zona.

Premissas que adotei (me diga se alguma estiver errada):
- **TBM** como uma obra só, do tipo EPB, em solo. Os outros tipos entram como texto no repositório.
- **NATM** em rocha branda ou solo rijo, com desmonte mecânico (sem explosivo).

### 4.2 Fichas rascunho

**Sobre as sequências:** como combinamos, a sequência de etapas é sua. As abaixo são só a minha proposta de partida. Você pode mudar a ordem, tirar ou incluir etapas.

#### A1 Túnel TBM (EPB)

| Item | Rascunho |
|------|----------|
| **Cena na superfície** | Poço de ataque com guindaste pórtico, correia de bota-fora até um silo, caminhões, pátio de aduelas, rua com prédios sobre o traçado, marcos de recalque |
| **Corte** | Túnel com a máquina visível: cabeça de corte, câmara de pressão, rosca de extração, macacos de propulsão, erector, anel de aduelas, injeção de graute atrás do escudo, solo em camadas e lençol freático |
| **Máquinas e atores** | TBM, trem de serviço com aduelas, guindaste pórtico, correia, caminhões, operários no pátio, topógrafo na rua |
| **Sequência (ciclo que se repete)** | 1 Escavar e propulsar → 2 Parar e montar o anel de aduelas → 3 Injetar o graute → 4 Avançar de novo; o solo sai pela correia o tempo todo |
| **Rótulos** | Cabeça de corte · Câmara de pressão · Rosca de extração · Macacos · Aduelas · Graute · Trem de apoio · Marcos de recalque |
| **Tour (câmera)** | Visão geral → poço de ataque → corte na frente da máquina → montagem do anel → superfície com os marcos |

#### A2 Túnel NATM

| Item | Rascunho |
|------|----------|
| **Cena na superfície** | Portal na encosta, jumbo de perfuração, robô de concreto projetado, caminhões, duto de ventilação, casa de apoio |
| **Corte** | Seção do túnel em avanço (calota, bancada e inverso), concreto projetado, cambotas, telas, chumbadores, maciço em camadas |
| **Máquinas e atores** | Escavadeira ou roadheader, caminhões de marinha, robô de projeção, operários, topógrafo medindo convergência |
| **Sequência (ciclo que se repete)** | 1 Escavar o avanço → 2 Remover a marinha → 3 Concreto projetado → 4 Cambotas e chumbadores → 5 Fechar o inverso e repetir |
| **Rótulos** | Calota · Bancada · Inverso · Concreto projetado · Cambota · Chumbador · Convergência |
| **Tour (câmera)** | Portal → interior com o avanço → corte da seção → fechamento do anel |

#### A5 Emboque / portal em encosta

| Item | Rascunho |
|------|----------|
| **Cena na superfície** | Encosta com o talude frontal sendo aberto em bancadas, escavadeira, caminhões, equipe de grampeamento e concreto projetado, topógrafo |
| **Corte** | Maciço com a superfície potencial de ruptura, grampos e concreto projetado no talude, enfilagens (guarda-chuva) no arco, cobertura rasa sobre o início do túnel |
| **Máquinas e atores** | Escavadeira, caminhões, perfuratriz de grampos, robô de projeção, perfuratriz de enfilagens, operários |
| **Sequência (linear: chega, executa, sai)** | 1 Mobilização e acesso → 2 Escavar o talude frontal em bancadas → 3 Grampear e projetar concreto em cada bancada → 4 Instalar as enfilagens → 5 Iniciar a escavação do túnel sob o guarda-chuva → 6 Primeiro avanço com concreto projetado e cambota |
| **Rótulos** | Bancada · Grampo · Concreto projetado · Enfilagem · Boca do túnel · Cobertura |
| **Tour (câmera)** | Encosta inteira → talude em bancadas → corte com os grampos → boca do túnel |

### 4.2.1 Decisões tomadas na Zona A (16/10)

- **Dois túneis separados na mesma zona** (confirmado por você): a **TBM** fica no lado plano da zona, a partir de um poço de ataque, em solo mole abaixo do lençol freático; o **NATM** e o **emboque** ficam na colina, onde está o portal.
- **A1 em corte, como ficou:** o terreno é cortado ao longo do eixo do túnel e a parte da frente é removida (incluindo a colina do NATM, só enquanto o corte está aberto). Você vê o poço, a TBM, os anéis, o graute, o trem de apoio e a correia que leva o solo até a superfície.
- **Ciclo animado da A1 (1,4 m por ciclo, 13,8 s a 1×):** 1 Escavar e propulsar (cabeça gira, macacos empurram) → 2 Parar e montar o anel (macacos recuam, erector coloca 6 aduelas, de baixo para cima, a de fecho por último) → 3 Injetar o graute (bicos na cauda do escudo, graute fresco em azul que vai "curando") → 4 Avançar de novo. A correia nunca para. Ao fim do trecho (cerca de 30 m) o ciclo reinicia.
- **Marcos de recalque (v1.0):** 9 marcos na superfície sobre o traçado afundam (exagerado) depois que a TBM passa, com rótulo.
- **Ainda falta na A1:** operários e caminhões no pátio de aduelas (estão só os da cena normal) e o tour de câmera da obra (vale para A1, A2 e A5).

- **A2 em corte, como ficou (v0.8):** a colina ganhou o portal escavado em bancadas e as camadas do maciço (solo superficial, solo residual, rocha alterada, rocha sã) aparecem na face do corte. O ciclo de 27,4 s a 1×: 1 Escavar o avanço (escavadeira desmonta a calota, 1,2 m por volta) → 2 Remover a marinha (caminhão entra, carrega, faz a manobra e sai pelo portal) → 3 Concreto projetado (robô com braço, concreto úmido que vai "curando") → 4 Cambotas e chumbadores (5 por anel) → 5 Fechar o inverso e repetir (bancada com rampa, inverso concretado, alvos de convergência em vermelho). Rótulos: calota, bancada, inverso, concreto projetado, cambota, chumbador, convergência, solo residual, rocha alterada, cobertura.
- **Ainda falta na A2:** jumbo de perfuração e duto de ventilação no interior, tour de câmera da obra.
- **A5 em corte, como ficou (v0.9, 65 s a 1×, linear: chega, executa, sai; ao fim repete):** o terreno da colina é uma malha que muda durante a animação. 1 Mobilização e acesso (marcos topográficos e escavadeira chegam ao topo) → 2 Escavar o talude em bancadas → 3 Grampear e projetar concreto → os passos 2 e 3 se alternam em **4 lances de cima para baixo** (14 m, 9,4 m, 4,7 m e 0 m): em cada lance a escavadeira desce, a perfuratriz crava 2 fileiras de grampos, o robô projeta o concreto, e só então o próximo lance começa → 4 Instalar as enfilagens (8 tubos em arco sobre a futura seção, com o portal já aberto) → 5 Iniciar a escavação sob o guarda-chuva (calota, marinha) → 6 Primeiro avanço: projetado, cambota e chumbadores (usa o mesmo túnel da A2). O painel mostra em que lance você está. Rótulos: bancada, grampo, concreto projetado, superfície de ruptura (tracejado vermelho), enfilagem, boca do túnel, cobertura rasa.
- **Perfil do talude (decisão minha, corrija se quiser):** 3 bancadas de corte com 2 bermas (face 1 de 9,4 m onde entra o túnel, face 2 de 4,6 m, face 3 de cerca de 4 m até o topo), grampos de 6 m inclinados 12° para baixo, enfilagens de 12,5 m inclinadas 6° para cima. A cobertura sobre a calota no portal é de só 1,9 m.
- **Simplificações assumidas na A5:** grampos, enfilagens e concreto são desenhados no plano do corte (na frente da parede) para ficarem visíveis; a superfície de ruptura é ilustrativa; não há caminhões no talude (o bota-fora do talude não é animado).

### 4.3 Para fechar a Zona A

- [x] Confirmar as premissas da seção 4.1 (dois túneis separados; TBM EPB em solo; NATM em rocha branda ou solo rijo)
- [ ] Corrigir a sequência de etapas das três obras (você é o especialista; eu só rascunhei)
- [ ] Dizer o que mais deve aparecer em cada obra. Eu aviso o que for caro de modelar

## 4B. Zona B — Fundação direta (rascunho para você corrigir)

**Catálogo confirmado:** B1 Sapata isolada · B2 Sapata corrida · B3 Sapata de divisa · B4 Radier · B5 Sapata associada · B6 Melhoria do solo sob fundação rasa. Prioridade P1 = B2 e B4.

**Ideia da cena:** um bairro de casas e prédios pequenos em obra. Em cada obra a **vista em corte** abre uma fatia do terreno ao longo do eixo da fundação, mostrando a escavação, o lastro, a armação, o concreto e o solo em camadas, com o **bulbo de tensões** como camada visual que você liga e desliga. Em cima da fundação aparece a construção que ela sustenta (casa ou prédio, conforme a coluna Contexto). Reaproveito o sistema de corte, o painel de etapas e os rótulos da Zona A.

Sobre as sequências: como na Zona A, **a sequência é sua**. As abaixo são só a minha proposta de partida. Pode mudar a ordem, tirar ou incluir etapas.

| Obra | Sequência proposta (linear: chega, executa, sai) | Rótulos | Complexidade |
|------|------|------|:---:|
| **B2 Sapata corrida** (P1) | 1 Locação e abertura da vala → 2 Apiloar o fundo e lançar o lastro de concreto magro → 3 Montar forma e armação da sapata e da viga baldrame → 4 Concretar e adensar → 5 Desformar, reaterrar e compactar | Vala · Lastro · Armação · Forma · Concreto · Reaterro · Camadas do solo | Média |
| **B4 Radier** (P1) | 1 Terraplenagem e compactação do terreno → 2 Camada de brita e lona plástica → 3 Formas de borda, malhas de armação e espaçadores → 4 Concretar e sarrafear a laje → 5 Acabamento e cura | Solo compactado · Brita · Lona · Armação · Concreto · Cura | Média |
| **B1 Sapata isolada** | 1 Locação e escavação do cavado → 2 Lastro de concreto magro → 3 Forma e armação da sapata e do arranque do pilar → 4 Concretar → 5 Reaterrar e compactar | Sapata · Pilar · Lastro · Armação · Bulbo de tensões | Média |
| **B5 Sapata associada** | 1 Escavação do cavado maior → 2 Lastro → 3 Armação para dois pilares próximos → 4 Concretar → 5 Reaterrar | Sapata comum · Dois pilares · Armação · Bulbo (dois bulbos se somam) | Média |
| **B3 Sapata de divisa** | 1 Escavar junto ao muro do vizinho com escoramento → 2 Armar a sapata excêntrica e a viga de equilíbrio → 3 Concretar → 4 Reaterrar e remover o escoramento | Muro do vizinho · Sapata excêntrica · Viga de equilíbrio · Escoramento | Alta |
| **B6 Melhoria do solo** | 1 Escavar o solo mole → 2 Substituir por camadas de brita ou solo-cimento → 3 Compactar cada camada → 4 Ensaio de placa → 5 Executar a sapata | Solo mole · Camadas · Compactação · Ensaio de placa | Média |

**Estado (v1.3): as seis obras da Zona B (B1 a B6) estão animadas em corte.**
- **B2 Sapata corrida:** vala escavada de verdade no terreno, lastro, armação (barras e estribos), formas, caminhão betoneira lançando concreto, seção em T (sapata e baldrame) com as barras em pontos, desforma, reaterro em camadas com compactador de placa, mureta de alvenaria; bulbo de tensões como elipses translúcidas com rótulo. 5 etapas.
- **B4 Radier:** cava rasa escavada pela retroescavadeira, rolo compactando o fundo, caminhão basculante lançando brita, lona plástica que se desenrola, formas de borda, malha dupla de armação com espaçadores, concretagem com betoneira, régua sarrafeando, desempenadeira mecânica e aspersão de água na cura. 5 etapas.
- **B1 Sapata isolada (v1.2):** gabarito com estacas e linhas, cavado quadrado, apiloamento, lastro, formas, malha de armação sobre calços, arranque do pilar com barras e estribos, forma do pilar, concretagem da sapata e do pilar, desforma, reaterro em 4 camadas compactadas, setas de carga e bulbo de tensões. 5 etapas.
- **B5 Sapata associada (v1.2):** mesma sequência com cavado e sapata maiores, dois pilares de cargas diferentes, armação inferior e superior (entre os pilares), dois bulbos que se somam e um envelope maior. 5 etapas.
- **B3 Sapata de divisa (v1.3):** muro do vizinho com a fundação rasa desenhada no corte, cavado rente à divisa com pranchas, longarina e escoras inclinadas, sapata excêntrica e sapata interna ligadas por viga de equilíbrio, arranques dos dois pilares, concretagem na ordem sapatas, pilares e viga, desforma, reaterro em 5 camadas e retirada das escoras e pranchas só no final. 4 etapas.
- **B6 Melhoria do solo (v1.3):** lente de argila mole desenhada na parede do corte, escavação, 4 camadas (2 de brita, 2 de solo-cimento) lançadas pelo caminhão basculante e compactadas (rolo nas duas primeiras, placa nas duas últimas; a camada solta afina ao compactar), ensaio de placa com macaco, pórtico e blocos (5 estágios de carga com recalque no texto) e sapata sobre o solo melhorado. 5 etapas (as etapas 2 e 3 se alternam a cada camada).
- Aproveitei o que você já tinha confirmado sobre máquinas e atores (retroescavadeira, betoneira, compactador, pedreiro e armador) e acrescentei rolo, caminhão basculante e desempenadeira no radier. Os rascunhos de sequência acima seguem valendo até você corrigir.

Perguntas para você (responda "ok" se concordar):
- [ ] A ordem de construção das obras acima está certa? Prefere que eu comece pelas duas P1 (B2 e B4) e depois adicione as variantes?
- [ ] O bulbo de tensões entra como camada opcional nas sapatas? (Eu proponho: sim, em B1, B2 e B5.)
- [ ] Máquinas e atores: retroescavadeira, betoneira ou caminhão betoneira, compactador de placa, pedreiro e armador. Falta algum?

---

## 4C. Zona C — Fundação profunda (rascunho para você corrigir)

**Estado (v2.0): C1, C2, C3, C4, C6, C7, C13 e C14 animadas em corte.** C13 (v2.0): barrete de 3 x 1,2 m e 17 m de profundidade; vala e muretas-guia concretadas e escoradas; guindaste com clamshell em 5 mordidas, solo descarregado ao lado e levado por caminhão; furo sempre cheio de lama bentonítica (faixa translúcida na seção, com usina e mangueira de circulação); gaiola em dois trechos (descida, emenda amarrada, descida conjunta); dois tubos de concretagem com funil, concreto subindo e deslocando a lama, tubos retirados aos poucos. Base para a parede diafragma (D6). C1 (v1.9): locação com estacas de madeira e cordel; operário girando o trado manual com cabo em T e hastes de extensão (3 ciclos, solo sacudido na pilha); gaiola baixada à mão; funil e betoneira, com concreto levado em carrinho de mão (3 lançamentos); arrasamento da cabeça com ponteira e marreta; vala, fôrmas, armação e concretagem da viga baldrame ligando a estaca às vizinhas. Diâmetro exagerado (0,6 m), 4,5 m de profundidade. C14 (v1.8): bloco sobre 2 estacas; escavadeira abre a cava até a cota do bloco, arrasamento das duas cabeças com rompedor (barras expostas), concreto magro, fôrmas escoradas, armação do bloco sobre espaçadores, arranques do pilar com estribos, concretagem com vibrador, alisamento e cura; escala exagerada (estacas de 1 m, bloco de 6 m). C3 (v1.7): perfuratriz com trado em 4 ciclos (o trado desce, sobe cheio, a máquina gira e joga o solo ao lado), tubo de aço curto no topo do furo, caçamba de limpeza tirando o solo solto do fundo, perfuratriz saindo, guindaste descendo a gaiola com espaçadores, tubo de concretagem (tremonha) até o fundo e concreto subindo de baixo para cima com o tubo sempre mergulhado; diâmetro exagerado como na C4, profundidade de 8,5 m acima do nível d’água. C2 (v1.6): tripé com guincho e balde, escavação do fuste em 7 trechos, cada um com sua camisa de concreto, base alargada em campana, engenheiro desce para inspecionar (insuflador de ar), barras de arranque, concretagem por funil (base e depois fuste) e cura; fuste de 1,2 m e base de 2,4 m (escala exagerada), acima do nível d’água. C6 e C7 (v1.5) usam o mesmo método: bate-estaca com mastro, estaca içada e aprumada, martelo com golpes (a estaca desce aos saltos e o solo em volta levanta), martelo sobe, segundo segmento é içado e soldado (faíscas e brilho na emenda), e cravação até a nega, com a nega em mm por 10 golpes no texto. Na C6 o perfil é de concreto com placas de topo; na C7 é um perfil H de aço.

**C4 (v1.4):** Perfuratriz chegando e aprumando o mastro, hélice descendo sem retirar solo (o solo sobe nas lâminas e forma a pilha ao lado), caminhão betoneira e bomba, concretagem durante a retirada da hélice (o concreto sobe sempre acima da ponta), perfuratriz saindo do caminho, guindaste baixando a gaiola de armação e pá-carregadeira limpando o solo. Duas estacas vizinhas já prontas aparecem no corte. **A estaca está com diâmetro exagerado (1,0 m)** para dar para ver. Profundidade 13,5 m, ponta no silte, atravessando o nível d’água sem revestimento.

Sequências propostas (a sequência é sua; estas são só o ponto de partida). As etapas já feitas na C4 estão em negrito.

| Obra | Sequência proposta | Rótulos | Complexidade |
|------|------|------|:---:|
| **C4 Hélice contínua** (P1, feita) | **1 Locação e posicionamento → 2 Perfuração com a hélice → 3 Concretagem na retirada da hélice → 4 Armadura e limpeza** | Hélice · Haste oca · Solo trazido · Concreto bombeado · Armação · Ponta na camada resistente | Alta |
| C1 Estaca broca | 1 Locação → 2 Perfurar com trado manual → 3 Armar e concretar com funil → 4 Arrasar e ligar ao baldrame | Trado · Furo sem revestimento · Armadura · Concreto | Baixa |
| C2 Tubulão a céu aberto | 1 Escavar o fuste com camisa de concreto → 2 Alargar a base (campana) → 3 Inspeção da base → 4 Armar e concretar | Fuste · Camisa · Base alargada · Camada resistente | Média |
| C3 Escavada com trado mecanizado | 1 Perfurar com trado → 2 Limpar o fundo → 3 Armadura → 4 Concretar com tremonha | Trado · Tremonha · Armadura | Média |
| C6 Pré-moldada cravada | 1 Posicionar a estaca → 2 Cravar com o martelo → 3 Emendar o segmento (solda ou anel) → 4 Cravar até a nega | Martelo · Emenda · Nega | Média |
| C7 Metálica | 1 Posicionar o perfil → 2 Cravar → 3 Soldar a emenda → 4 Cravar até a nega ou rocha | Perfil · Solda · Ponta | Média |
| C13 Estacão / barrete | 1 Muretas-guia → 2 Escavar com clamshell e lama bentonítica → 3 Descer a armadura → 4 Concretar com tremie deslocando a lama | Lama · Clamshell · Tremie · Armadura | Alta |
| C14 Bloco de coroamento | 1 Escavar em volta das estacas → 2 Arrasar as estacas → 3 Armar o bloco com os arranques → 4 Concretar | Estacas · Arrasamento · Armadura · Bloco | Média |
| C5, C8 a C12, C15, C17 | a propor depois de confirmar as acima | | |

Perguntas para você (responda "ok" se concordar):
- [ ] A estaca com diâmetro exagerado (1,0 m) e profundidade de 13,5 m ficou boa para o corte, ou prefere escala real (0,4 a 0,6 m)?
- [ ] Prefere seguir a Zona C pelas P1 e P2 (C4, depois C1, C2, C3, C6, C7, C14), deixando as P3 para o fim?

---

## 4D. Zona D — Escavações e contenções (rascunho para você corrigir)

**Estado (v2.6): D1 a D8, D10, D11 e D14 animadas em corte.** Estas obras (D1 a D7) usam o mesmo canteiro: cava de 15 m de largura e 8 m de profundidade, cercada por cortina de estacas (diâmetro exagerado de 1,0 m, 13,5 m de comprimento, ficha de cerca de 6 m abaixo do fundo), com um **prédio vizinho de 4 andares ao norte** (aberto em corte, com lajes, pilares e sapata corrida a 2 m da cortina), **rua com carros e cones ao sul**, **guindaste com caçamba** que tira o solo e despeja nos caminhões, escavadeira no fundo da cava e solo em camadas nas paredes. A cava estática da vista geral continua igual: ela some quando uma obra da Zona D entra e volta quando sai.

**D1 (v2.1):** 1 Executar a cortina (perfuratriz, 33 estacas em três lados, cada uma descendo até 13,5 m) → 2 Viga de coroamento e 1ª escora (escavadeira abre 1 m, escoras de aço nas 4 linhas) → 3 Escavar até 4,7 m com caçamba içada, instalar a longarina e as escoras do 2º nível → 4 Escavar até 8 m e regularizar o fundo. Duas passagens de caminhão, carros na rua.

**D5 (v2.1):** a cortina já nasce pronta. 1 Escavar até o 1º nível (3,4 m) → 2 Perfurar (perfuratrizes inclinadas a 20°, uma por parede), descer a barra e injetar o bulbo (5 m de bulbo e 7,5 m de trecho livre, desenhados no plano do corte, passando sob a rua e sob o prédio vizinho) → 3 Protender com macaco hidráulico até 300 kN e travar a cabeça → 4 Escavar até 6,5 m, repetir no 2º nível e escavar até 8 m. A cava termina livre de escoras.

**D6 (v2.2):** a seção corta o painel 1 da parede norte (parede de 1,2 m de espessura e 15 m de profundidade, escala exagerada). 1 Muretas-guia (vala, fôrmas, concretagem e escoras de madeira) → 2 Escavar o painel com clamshell em 4 mordidas, furo sempre cheio de lama bentonítica (usina e mangueira de circulação) → 3 Gaiola em dois trechos, emendada e descida até 1 m do fundo → 4 Tubos de concretagem, concreto subindo e deslocando a lama; em seguida os painéis vizinhos das paredes norte, sul e leste surgem → 5 Viga de coroamento, escavação da cava até 11 m (passando do nível d’água, que fica fora da cava), com caçamba içada e escoras em 3 níveis. Parede e escoras ficam à vista no corte.

**D14 (v2.6):** a vala corre ao longo de x e a seção a corta de lado a lado, numa rua com calçadas, faixa livre para os carros e sinaleiro. 1 Cones, barreira e placa; o pavimento é cortado e removido → 2 Escavar até 1,5 m, descer a blindagem metálica (3 módulos azuis com escoras hidráulicas, desenhados também no corte) e escavar até 3,6 m com o solo levado por caminhão → 3 Berço de areia e três tubos de 0,8 m (escala exagerada), levantados do chão por um caminhão com guindaste, girados e descidos na vala, com juntas → 4 Reaterro em 8 camadas compactadas pelo compactador de placa dentro da vala, a blindagem sobe junto com o aterro, fita de aviso acima do tubo → 5 Base de brita e asfalto (vibroacabadora e rolo), cones saem e a faixa reabre.

**Muros de arrimo (v2.5):** D8, D10 e D11 compartilham o mesmo canteiro de contenção por aterro: o muro corre ao longo de x (14 m), o aterro de 3,5 m fica ao norte e a rua ao sul; o prédio vizinho some e o corte passa pela seção do muro. Aterro em 7 camadas de 0,5 m, cada uma com caminhão basculante, espalhamento, rolo compactador e compactador manual junto ao muro (a cor da camada escurece ao compactar). **D8 gravidade:** vala, concreto magro, fôrmas de madeira com escoras, 4 camadas de concretagem com betoneira, tubo dreno com brita no pé, barbacãs, manta de brita e geotêxtil que sobem com o aterro. **D10 flexão (L):** sapata e fuste com armadura (barras 3D e desenho da armadura no corte), concretagem da sapata, fôrmas com tirantes e escoras, fuste em 2 etapas, dreno e aterro sobre o talão. **D11 gabião:** 4 fiadas de gaiolas (3, 3, 2 e 2 m de largura, recuando atrás), tela de aço e pedras (rachão), aterro e geotêxtil a cada fiada, sem barbacãs porque o gabião é permeável.

**D7 (v2.4):** solo grampeado em 4 etapas de 1,5 m (6 m no total). Em cada etapa: escavar o trecho (caçamba e caminhão) → furadeira inclinada 15° abre os furos → instalar a barra de aço com espaçadores e injetar a calda de cimento (grampos desenhados no plano do corte, com a cabeça e a placa) → concreto projetado com tela, de baixo para cima, com poeira de jateamento; depois a escavação segue para o próximo trecho. A sapata do prédio vizinho fica acima do primeiro nível de grampos; a face fica toda coberta de concreto projetado no fim.

**D2 (v2.3):** estacas primárias alternadas (concreto claro, sem armadura), depois secundárias (concreto escuro, armadas) cortando as primárias; as cabeças aparecem como discos no terreno para ver a interseção em planta; escavação de 6,5 m com escoras em 2 níveis, revelando a parede contínua e estanque. **D3 (v2.3):** estacas lado a lado com pequenas frestas; escavação com escoras mostra as frestas e o solo escapando (gotas de solo); no fim o concreto projetado cobre as três paredes, de cima para baixo, e fecha as frestas. **D4 (v2.3):** cortina com ficha de 6 m, sem apoio; escavação de 3,6 m; as estacas se inclinam para dentro da cava (deslocamento ampliado 10 vezes, com o valor em cm na barra de estado), diagramas de empuxo ativo (vermelho) e passivo (verde) no corte, e trincas no terreno atrás da cortina.

Sequências propostas para as demais (a sequência é sua; estas são só o ponto de partida):

| Obra | Sequência proposta | Rótulos | Complexidade |
|------|------|------|:---:|
| **D1 Escavação urbana com cortina** (P1, feita) | **1 Cortina de estacas → 2 Viga de coroamento e 1ª escora → 3 Escavar e escorar o 2º nível → 4 Escavar até o fundo** | Cortina · Ficha · Viga · Escoras · Caçamba · Prédio vizinho | Alta |
| **D5 Cortina atirantada** (P1, feita) | **1 Escavar até o 1º nível → 2 Perfurar e injetar o tirante → 3 Protender → 4 Repetir nos níveis seguintes** | Trecho livre · Bulbo · Cabeça · Macaco · Perfuratriz | Alta |
| **D6 Parede diafragma** (feita) | **1 Muretas-guia → 2 Escavar o painel com clamshell e lama → 3 Descer a gaiola → 4 Concretar com tremonha → 5 Escavar a cava e escorar** | Mureta · Clamshell · Lama · Gaiola · Tubos · Parede · Escoras | Alta |
| **D2 Estacas secantes** (feita) | **1 Estacas primárias (concreto fraco) → 2 Estacas secundárias cortando as primárias → 3 Escavar revelando a parede estanque** | Primária · Secundária · Interseção | Média |
| **D3 Estacas tangentes** (feita) | **1 Estacas lado a lado → 2 Escavar e mostrar as frestas e o solo escapando → 3 Fechar as frestas com concreto projetado** | Estaca · Fresta · Solo escapando · Concreto projetado | Média |
| **D4 Cortina em balanço** (feita) | **1 Executar a cortina com bastante ficha → 2 Escavar sem apoio → 3 Empuxo, deslocamento e embutimento** | Ficha · Empuxo ativo e passivo · Deslocamento · Trincas | Baixa |
| D7 Solo grampeado | 1 Escavar 1,5 m → 2 Furar e instalar o grampo → 3 Projetar o concreto → repetir | Grampo · Face · Concreto projetado | Média |
| D8 Muro de gravidade | 1 Escavar a base → 2 Montar fôrmas e concretar por camadas → 3 Dreno e reaterro | Muro · Dreno · Reaterro | Baixa |
| D10 Muro por flexão | 1 Base → 2 Armação em L → 3 Fôrma e concretagem → 4 Reaterro compactado com dreno | Laje de base · Cortina · Dreno | Média |
| D11 Gabião | 1 Montar as gaiolas → 2 Encher com pedras → 3 Empilhar com geotêxtil e dreno | Gaiola · Pedra · Geotêxtil | Baixa |
| D14 Vala urbana escorada | 1 Escavar com escoras → 2 Assentar o tubo → 3 Reaterro → trânsito desviado | Escoras · Tubo · Berço | Média |
| D9, D12, D15 | a propor depois (prioridade 3) | | |

Perguntas para você (responda "ok" se concordar):
- [ ] A cava de 15 x 8 m com estacas de 1,0 m (escala exagerada) e o prédio vizinho aberto em corte ficaram boas para o corte?
- [ ] Na D5, os tirantes só aparecem no plano do corte (os outros, atrás do solo, não são mostrados). Para você está bom?
- [ ] Na D6, a parede com 1,2 m de espessura e a escavação passando do nível d’água ficaram claras? A Zona D de prioridade 2 está completa. Posso seguir para a Zona E (e depois F, G, H), ou prefere antes revisar o que já está pronto?

---

## 4E. Zona E — Vias e pavimentos (rascunho para você corrigir)

**Estado (v2.8): E1, E2, E4, E5 e E6 animadas em corte.** A via corre ao longo de x (40 m de comprimento, 10 m de largura, com calçadas e cones); a seção atravessa a pista de lado a lado e mostra as camadas crescendo. A escala é exagerada: caixa de 1,2 m, com sub-base de 0,60 m, base de 0,40 m, binder de 0,12 m e capa de 0,10 m. A vinheta estática da vista geral some quando a obra entra e volta quando sai.

**E1 (v2.7):** 1 Cones, escavação da caixa até o subleito (escavadeira e caminhão de bota-fora), regularização com motoniveladora e compactação com rolo (grau de compactação sobe de 88% a 100%) → 2 Sub-base: caminhão basculante despeja em pilhas, motoniveladora espalha, caminhão-pipa umedece e o rolo compacta (nota de GC % do Proctor, técnico com ensaio de densidade) → 3 Base de brita graduada, mesma sequência, e imprimação com caminhão distribuidor de ligante → 4 Binder e capa de CBUQ: caminhão, vibroacabadora e rolo, com a temperatura caindo de 150 °C; pintura de ligação entre as camadas → 5 Faixa pintada, cones saem e os carros voltam.
- Pendente de sua confirmação: espessuras exageradas, ordem das etapas e se o ensaio de densidade merece um detalhe próprio.

**E6 (v2.8) Geossintéticos em pavimentos:** mesma via do E1. 1 Cones, caixa e subleito compactado → 2 Geotêxtil de separação desenrolado por um rolo sobre o subleito (sobreposição de 30 a 50 cm), depois a sub-base → 3 Geogrelha de reforço (malha escura) estendida sobre a sub-base, depois a base → 4 Imprimação, binder e capa → 5 Faixa, cones e tráfego. No corte, o geotêxtil é a linha clara embaixo da sub-base e a geogrelha, a linha escura sob a base.

**E2 (v2.8) Pavimento de concreto (rígido):** caixa de 0,95 m, sub-base de 0,45 m e laje de concreto de 0,52 m (exagerada). 1 Cones, caixa e subleito → 2 Sub-base → 3 Cestas de barras de transferência a cada 5 m, e barra de ligação na junta longitudinal (aparece no corte) → 4 Betoneira e pavimentadora de formas deslizantes; o concreto escuro (úmido) clareia ao curar; caminhão borrifa o composto de cura (película branca) → 5 Serra de juntas corta cada junta a 1/3 da espessura, junta longitudinal e faixa; tráfego liberado.

**E5 (v2.8) Reforço de pavimentos:** a via começa já existente: capa desgastada com trincas, faixa desbotada, binder, base e sub-base. 1 Avaliação (técnico com ensaio de deflexão) → 2 Fresadora raspa a capa, a esteira joga o material fresado (RAP) no caminhão → 3 Varrer e pintura de ligação → 4 Vibroacabadora e rolo espalham a capa nova sobre o binder existente → 5 Faixa nova e tráfego.

**E4 (v2.8) Estrada com corte e aterro:** seção numa encosta (sobe para o norte), greide a 4,2 m, corte à esquerda com talude 1:1 e valeta, aterro à direita com talude 1:1,5. 1 Topografia: estacas e linha tracejada amarela do projeto, linha branca do terreno natural → 2 Limpeza: trator remove árvores e solo orgânico, que fica estocado → 3 Corte em três bancadas, escavadeira e caminhões → 4 Aterro em seis camadas: caminhão, trator espalha, rolo pé de carneiro compacta (GC sobe de 88% a 100%) e técnico faz o ensaio de densidade → 5 Motoniveladora regulariza a plataforma, valeta de concreto e hidrossemeadura nos taludes (o solo estocado é reposto).
- Pendente de sua confirmação: perfil do terreno e inclinações dos taludes (exagerados), espessuras das camadas dos pavimentos e a ordem das etapas.

## 4F. Zona F — Obras de terra e encostas (rascunho para você corrigir)

**Estado (v2.9): F1, F2, F3, F4 e F5 animadas em corte.** A seção em x = -46 corta o morro da zona de lado a lado (eixo z). A obra roda sobre um terreno plano ou sobre um perfil próprio, que substitui o morro original apenas enquanto a obra está aberta. Todas usam o mesmo motor de perfil (faixas de material por coluna, superfície deformável, máquinas, notas e rótulos).

**F5 Compactação de solos:** três camadas lançadas, espalhadas, umedecidas e compactadas, cada uma com um rolo diferente (pé de carneiro na argila, vibratório na areia, liso no acabamento). Um painel mostra os grãos se aproximando (índice de vazios) e a curva de compactação (Proctor) com o grau de compactação, a umidade e a densidade da camada. Ensaio de densidade ao fim de cada camada.

**F2 Cortes em solo e rocha:** morro com solo residual, saprolito e rocha. 1 Sondagens e projeto (linha amarela) → 2 Limpeza → 3 Corte em bancadas no solo e saprolito, com berma → 4 Perfuração em malha e carga explosiva → 5 Detonação (clarão, poeira e fragmentos) e escavação da rocha, talude quase vertical → 6 Canaletas de berma, chumbadores na rocha e hidrossemeadura.

**F3 Aterros:** 1 Locação → 2 Retirada do solo orgânico da fundação → 3 a 4 nove camadas de 0,6 m (caminhão, espalhamento, compactação, ensaio; a camada solta é mais grossa que a compactada) → 5 Talude 1:1,5, canaletas e descidas d'água → 6 Hidrossemeadura.

**F4 Aterro sobre solo mole:** crosta, 6 m de argila mole e solo firme (visíveis abaixo do terreno). 1 O problema → 2 Colchão drenante de areia → 3 Drenos verticais (PVD) cravados em malha → 4 Aterro em etapas, com placa de recalque e painel (recalque × tempo, com e sem drenos) → 5 Sobrecarga temporária e espera → 6 Retirada da sobrecarga e pavimento. O terreno afunda de verdade durante a animação.

**F1 Estabilidade de encostas (fenômeno + solução):** encosta de solo residual sobre rocha, com painel do fator de segurança (FS). 1 Equilíbrio (FS 1,5) → 2 Chuva, nível d'água sobe e FS cai; aparecem trincas → 3 Ruptura circular (escarpa e levantamento no pé) → 4 Investigação e projeto → 5 Retaludamento com berma, canaleta e drenos horizontais profundos → 6 Solo grampeado, concreto projetado e hidrossemeadura (FS final 1,67).
- Pendente de sua confirmação: alturas e inclinações (exageradas), a ordem das etapas, os valores de FS e se F1 deve virar duas obras (fenômeno e estabilização).
- Pendente (prioridade 3): F6, F7 e F9.

---

## 4G. Zona G — Investigação e ensaios (rascunho para você corrigir)

**Estado (v3.11): G1 a G12 animadas em corte (falta só a G13, o laboratório, que não tem animação).** Seção em x = 57, mostrando as camadas reais da cidade (solo superficial, argila, areia, nível d'água, areia saturada, silte); o laboratório e as outras vinhetas da zona somem enquanto a obra está aberta.

**G1 Sondagem SPT:** 1 Locação: o topógrafo crava a estaca, a equipe chega e monta o tripé com roldana → 2 Perfuração metro a metro (trado manual no 1º metro, lavagem abaixo do nível d'água) → 3 Ensaio: amostrador padrão descido, martelo de 65 kg com queda de 75 cm, contagem dos golpes em três trechos de 15 cm (NSPT = últimos 30 cm), com o texto "Prof. X m: 2º trecho de 15 cm, N golpes" → 4 A cada metro, uma barra no gráfico de NSPT (verde para solo mole, vermelho para solo compacto), uma linha na tabela (litologia e consistência) e um frasco de amostra na mesa; o nível d'água aparece em 9,6 m → 5 Sondagem encerrada a 13 m: impenetrável (50 golpes para 8 cm).
- Perfil de NSPT adotado (exemplo, não é de projeto): 6, 5, 3, 2, 2, 3, 7, 10, 13, 17, 23, 32, >50. Pendente de sua confirmação: se prefere valores diferentes, a profundidade final e a ordem das etapas.

**G3 Ensaio CPT:** 1 Caminhão cravador chega, é calçado com macacos e alinhado ao ponto → 2 Macaco hidráulico crava a ponteira a velocidade constante, rosqueando uma haste de 1 m a cada metro → 3 Gráficos contínuos crescendo junto com a ponteira: resistência de ponta qc (MPa) e razão de atrito Rf (%), com leitura numérica na legenda → 4 Rf separa argila (alto, laranja) de areia (baixo, amarelo), com as divisas das camadas marcadas → 5 Retirada das hastes e curvas prontas. Curvas sintéticas de exemplo, coerentes com as camadas da cidade.
- Pendente: se prefere mostrar também fs separado e a interpretação por classes (Robertson), e se esta obra deve virar CPTU (G4) com poropressão.

**G11 Piezômetro de tubo aberto:** 1 Locação e furo de 11 m → 2 Tubo de PVC com trecho filtrante, areia de filtro, selo de bentonita, aterro do furo e proteção na boca → 3 Água sobe no tubo; técnico mede o nível com sonda sonora (9,6 m) → 4 Um ano de leituras: gráfico de chuva mensal e de nível d'água (sobe na chuva, desce na seca, com atraso) → 5 Diagrama de poropressão u = γw·h abaixo do nível d'água.
- Pendente: tipo de piezômetro (tubo aberto, pneumático ou corda vibrante) e se quer a leitura automática com datalogger.

**G5 Vane test (palheta):** 1 Locação e pré-furo de 2 m → 2 Palheta de quatro lâminas cravada até 3, 4, 5 e 6 m, na argila mole → 3 Rotação lenta, com a curva su x rotação crescendo até o pico (e a legenda mostrando o valor) → 4 Dez voltas rápidas e nova rotação, resistência remoldada (curva tracejada), com a sensibilidade St = su/sur → 5 Perfil de su com a profundidade (barras de pico e remoldada). Valores de exemplo: su de pico 12, 14, 17 e 21 kPa; remoldada 3,0, 3,7, 4,2 e 5,0 kPa.
- Pendente: se quer mostrar também a correção de Bjerrum e a fórmula do torque com as dimensões da palheta.

**G6 Ensaio de placa:** 1 Locação → 2 Escavadeira abre a cava (1 m) até a cota de apoio, a placa de aço é assentada, e sobre ela o macaco com célula de carga, a viga de reação e os tirantes com ancoragens a 4,5 m → 3 Oito estágios de 25 kPa (até 200 kPa), com relógios comparadores em viga de referência, o bulbo de tensões (isóbaras 0,8q, 0,5q, 0,2q e 0,1q) crescendo sob a placa e a curva carga x recalque se formando → 4 Descarregamento, com recuperação elástica (35% do recalque máximo) → 5 Interpretação: ruptura em torno de 300 kPa, tensão admissível de 100 kPa (FS = 3), recalque de 9 mm. O recalque da placa é ampliado 45 vezes na animação.
- Pendente: tamanho da placa (aqui exagerada, 1,4 m, contra os 0,80 m normatizados), critério de interpretação (ruptura física ou convencional) e se quer também o ensaio de placa helicoidal (parafusada).

**G7 Prova de carga estática em estaca:** 1 Estaca de prova de 10 m, instrumentada com extensômetros (5 profundidades), bloco de coroamento na cabeça → 2 Duas estacas de reação (tração) ligadas por tirantes à viga, macaco com célula de carga, relógios em viga de referência → 3 Dez estágios de 160 kN, até 1.600 kN (2x a carga de trabalho de 800 kN); o diagrama de transferência (à esquerda) mostra a carga caindo com a profundidade, com a resistência de ponta ao pé (10% a 22% da carga); a curva carga x recalque cresce → 4 Descarregamento com recuperação elástica → 5 Ruptura convencional (recalque de 18 mm) em torno de 1.500 kN, carga admissível de 750 kN (FS = 2). O recalque está ampliado 50 vezes na animação. Valores de exemplo.
- Pendente: tipo da estaca (aqui, genérica), critério de ruptura (NBR 6122, Van der Veen ou Davisson) e se quer prova de carga dinâmica (G8) com a mesma estaca.

**G8 Ensaio de carregamento dinâmico (PDA):** 1 Técnico chega à estaca da obra → 2 Guindaste posiciona o martelo, capacete com coxim na cabeça, acelerômetros e extensômetros ligados ao analisador PDA → 3 Três golpes com altura crescente: martelo cai, a onda de compressão (azul) desce pela estaca e a onda refletida (laranja) sobe; nega por golpe (2, 3 e 3 mm) → 4 Gráfico de F (laranja) e Z·v (verde) por 20 ms, com t1 e t1 + 2L/c marcados (método Case) → 5 Capacidade mobilizada 930, 1.310 e 1.480 kN, em concordância com a ruptura da prova estática (G7). Onda desacelerada na animação. Curvas sintéticas, didáticas.
- Pendente: se quer mostrar a análise CAPWAP (separação de atrito e ponta) e o cálculo explícito do método Case.

**G9 Ensaio de integridade (PIT):** 1 Equipe chega ao bloco de estacas → 2 Limpeza e nivelamento das cabeças, acelerômetro fixado, analisador PIT ligado → 3 Estaca 1 (íntegra): martelo manual leve, onda desce e volta, reflectograma com a reflexão do pé a 10 m → 4 Estaca 2, com estrangulamento a 4 m (seção de 0,45 m em vez de 0,9 m): reflexão negativa a 4 m e reflexão do pé menor → 5 Comparação dos dois reflectogramas e decisão (aceitar, nova prova ou reforço). Profundidade da reflexão x = c·t/2. Sinais sintéticos, didáticos.
- Pendente: se quer outros defeitos além do estrangulamento (trinca, contaminação, emenda) em uma terceira estaca.

**G10 Monitoramento de recalques de fundações:** 1 Equipe topográfica chega à obra: prédio de três pavimentos sobre sapatas → 2 Três sapatas (uma sobre solo firme, duas sobre argila mole), pinos de recalque nos pilares e referência de nível (RN) profunda fora da área de influência → 3 Leitura zero e construção dos três pavimentos: a carga cresce em etapas e as sapatas descem, com adensamento depois de cada etapa → 4 Nivelamento periódico com nível ótico e mira graduada sobre cada pino, durante 24 meses, com gráfico recalque x tempo crescendo (três curvas) → 5 Estabilização: assíntotas e recalque diferencial P3 − P1 ≈ 19 mm em 10 m, distorção angular ≈ 1/520, perto do limite usual de 1/500 para alvenaria.
- Recalques finais adotados (exemplo, não é de projeto): P1 12 mm, P2 20 mm, P3 31 mm, em 24 meses. Pendente: critério de distorção angular (1/500, 1/300 ou outro), frequência das leituras e se quer incluir recalque por adensamento secundário.

**G4 Ensaio CPTU (piezocone):** 1 Caminhão cravador chega e é calçado, como no CPT → 2 Piezocone (cone com filtro poroso atrás da ponta) cravado a 2 cm/s, uma haste de 1 m a cada metro → 3 Três gráficos crescendo juntos: qc (MPa), u2 (kPa) e Rf (%); na argila, qc baixo, Rf alto e u2 muito acima da hidrostática; na areia, u2 ≈ u0 → 4 Reta hidrostática u0 pontilhada, cruzando o nível d'água em 9,6 m, e linhas de limite das camadas → 5 Retirada das hastes e relatório com os três perfis.
- Poropressão adotada (exemplo, não é de projeto): u2 na argila de 120 a 190 kPa (excesso por cravação, já que a camada está saturada), ≈ 0 na areia acima do nível d'água, hidrostática (9,81 kPa por metro abaixo de 9,6 m) mais um pequeno excesso na areia saturada e no silte. Pendente: ensaio de dissipação (pausa a 5 m, curva u2 x tempo e coeficiente de adensamento) e correção qt = qc + u2 (1 − a).

**G2 Sondagem rotativa:** 1 Locação e sonda rotativa com tanque e bomba de água → 2 Solo até 7 m perfurado com revestimento cravado → 3 Barrilete duplo com coroa de diamante, cinco manobras de 1,4 m (7,0 a 14,0 m), com água circulando → 4 A cada manobra, o barrilete interno sobe por cabo (wireline) e o testemunho vai para a caixa (pedaços ≥ 10 cm em destaque, fragmentos e perdas marcados), com REC e RQD → 5 Boletim por manobra e média: REC 89%, RQD 58% (maciço regular).
- Maciço adotado (exemplo, não é de projeto): rocha alterada de 7 a 10 m e rocha sã de 10 a 14 m, desenhada sobre a seção da cidade (que ali tem areia e silte). REC = 62, 86, 96, 100, 100%; RQD = 0, 32, 72, 90, 96%. Pendente: tipo de coroa e diâmetro (NX, HX), grau de alteração e de fraturamento (W/F) por manobra, e se quer a perda de água (ensaio de perda d'água) no mesmo furo.

**G12 Inclinômetro:** 1 Locação ao pé do futuro aterro → 2 Furo de 14 m até o silte, tubo-guia com quatro ranhuras (uma alinhada para fora do aterro) e calda de cimento e bentonita, de baixo para cima → 3 Leitura zero: torpedo desce até o fundo e sobe parando a cada 0,5 m, unidade de leitura registra → 4 Aterro em três etapas (1,4, 2,7 e 4,0 m) com caminhão e rolo; a argila é empurrada para o lado (setas), o tubo se deforma (ampliado 45 vezes) e uma leitura após cada etapa acrescenta uma curva ao gráfico deslocamento x profundidade → 5 Leitura final após 30 dias e interpretação: máximo na argila, pé fixo, deslocamento que quase para entre as etapas (aterro estável); o texto explica o que indicaria ruptura.
- Valores adotados (exemplo, não é de projeto): deslocamentos máximos de 7, 16, 27 e 30 mm, todos a 4,6 m de profundidade (forma de sino centrada na argila, zero abaixo de 10 m); aterro com taludes 1:2 (lado do tubo) e 1:1,75. Pendente: se prefere o inclinômetro numa encosta (F1) ou numa escavação (D) em vez do aterro, se quer também a velocidade de deslocamento (mm/dia) com limites de alerta, e se a G12 deve incluir outros instrumentos (marcos superficiais, extensômetro magnético, piezômetro elétrico).

## 4H. Zona H — Barragens e rejeitos (rascunho para você corrigir)

**Estado (v3.0): H1 e H4 animadas em corte.** Seção em x = 3 sobre o vale da zona; usa o mesmo motor de perfil da zona F.

**H1 Barragem de terra zonada:** 1 Locação e projeto (estacas, altura 7 m, taludes 1:2,2 a montante e 1:2 a jusante, crista de 6 m) → 2 Fundação: escavação da trincheira de vedação (3 m) e preenchimento com solo argiloso → 3 Tapete e dreno de pé, filtro chaminé vertical → 4 Aterro em sete camadas de 1 m (núcleo argiloso, espaldares, rolo, ensaio) → 5 Proteção: enrocamento a montante, hidrossemeadura a jusante, crista e vertedouro → 6 Instrumentação (3 piezômetros) e enchimento do reservatório, com a linha de percolação (pontilhado azul, com fluxo) atravessando o núcleo, o filtro e o tapete até o dreno de pé.
- Pendente de sua confirmação: dimensões (exageradas), tipo de núcleo e a ordem das etapas. Variantes (enrocamento, concreto) ficam para depois.

**H4 Pilha de rejeitos filtrados:** 1 Locação e projeto (6,6 m em bancos de 2 m com bermas) → 2 Fundação limpa, colchão drenante e dreno de fundo central → 3 Seis camadas de 1 m: caminhão descarrega, trator espalha, rolo compacta (GC sobe de 88% a 100%), ensaio de densidade → 4 Canaletas de concreto nas bermas e hidrossemeadura → 5 Piezômetros, marcos topográficos e água limpa saindo do dreno de fundo.
- Pendente de sua confirmação: altura e largura das bermas, tipo de rejeito (filtrado, não pasta ou úmido) e a ordem das etapas.

## 5. Decisões a tomar

### DEC1. Tecnologia 3D
- **Recomendação:** Three.js + Vite. O Node.js entra só como ferramenta de desenvolvimento, **sem backend**. O vídeo 2 mostra um app 3D inteiro em um único arquivo HTML com Three.js, o que confirma que a tecnologia dá conta. Com 51 obras, vale organizar o código em arquivos (Vite) em vez de um arquivo só.
- Alternativas: React Three Fiber; Babylon.js; Unity/Godot exportando para web.
- Sua resposta: **ok**. Three.js + Vite.

### DEC2. Estilo visual
Os vídeos mostram um estilo diferente do Cities: Skylines. No vídeo 1 é uma maquete branca (argila) com uma única cor de destaque. O jogo é mais colorido e cheio de detalhe.
- **Recomendação:** estilo **híbrido**. A cidade em tons claros de argila, a **obra ativa em cor** (amarelo-obra ou laranja) e o **corte do subsolo com camadas de solo bem coloridas**. Fica elegante, é rápido de produzir e o olho vai direto para o que importa. A vida da cidade (pessoas, veículos, árvores) vem do Skylines, só que simplificada.
- Alternativas: argila pura (como o vídeo 1); colorido cheio (como o jogo, mais caro de produzir); realista (inviável para uma pessoa só).
- Sua resposta: **ok**. Estilo híbrido.

### DEC3. Câmera e modos de navegação
- **Recomendação:** dois modos. **Explorar**: câmera livre estilo city builder (arrastar, zoom, girar e inclinar, com limites). **Tour guiado**: passos numerados na parte de baixo e um cartão de texto, com a câmera voando entre pontos (como no vídeo 1). Ao clicar numa obra, a câmera voa até ela e abre o painel.
- Sua resposta: **ok**. Modos Explorar e Tour guiado.

### DEC4. Como os modelos 3D são feitos
- **Recomendação:** **modelagem por código** como método principal. Eu monto as peças (TBM, escavadeira, estaca, camadas de solo) com formas geométricas e extrusões em Three.js. O estilo argila e low-poly combina com isso. Vantagens: arquivos leves, fáceis de ajustar e eu consigo iterar direto, sem depender de programa externo. Para pessoas, árvores e veículos comuns posso usar assets gratuitos CC0 (Kenney, Quaternius, Poly Pizza).
- Alternativa: modelar no Blender e exportar GLB (mais detalhe, mas exige mais trabalho manual e deixa os ajustes mais lentos).
- Sua resposta: **ok**. Modelagem por código.

### DEC5. Como as animações funcionam
- **Recomendação:** cada obra é uma **sequência de etapas definida por você**. Obras lineares (estacas, sapatas) vão da chegada da máquina até a saída, por exemplo: máquina chega → perfura → coloca a armação → concretagem → máquina sai. Obras repetitivas (TBM, NATM) repetem o ciclo de avanço. Animação procedural (veículos em trajetos, braços e hastes articulados) e instâncias para repetir operários e caminhões sem pesar. No tour, cada passo aponta para uma etapa.
- **Como trabalhamos:** eu faço a modelagem inicial e uma primeira animação; você confirma se estão todas as etapas daquele tema; eu ajusto.
- Sua resposta: **ok**, com o fluxo acima.

### DEC6. Hierarquia dos repositórios
- **Recomendação:** dois níveis: **repositório da zona** (geral) + **repositório da obra** (específico). O painel da obra mostra os itens dela e, em outra aba, os da zona.
- Sua resposta: **ok** (você disse "concordo com suas respostas"; se quiser mudar alguma, é só avisar).

### DEC7. Ordem de desenvolvimento
- **Recomendação:** zona por zona, na ordem **A → H**, e só entramos na próxima quando a anterior estiver aprovada por você. **Primeiro vem uma base técnica** (cena, câmera, estilo, vista em corte) construída junto com a Zona A. Interação e repositório vêm depois de todas as zonas, como você pediu (planejar, animar, depois funcionalidade).
- Alternativa: fazer uma obra de cada zona primeiro, para validar tudo, e voltar depois para completar.
- Sua resposta: **ok** (você disse "concordo com suas respostas"; se quiser mudar alguma, é só avisar).

### DEC8. Níveis de qualidade gráfica
- **Recomendação:** Baixa / Média / Alta nas configurações (sombras, pós-processamento, quantidade de agentes), com detecção automática no primeiro acesso.
- Sua resposta: **ok** (você disse "concordo com suas respostas"; se quiser mudar alguma, é só avisar).

### DEC9. Referências por link (Drive, YouTube, sites)
- **Recomendação:** guardar só URL + título + tipo. YouTube abre embutido no painel; Drive abre pelo link de visualização (depende de estar compartilhado); artigos em nova aba.
- Sua resposta: **ok** (você disse "concordo com suas respostas"; se quiser mudar alguma, é só avisar).

### DEC10. Arquivos locais (PDF, foto, áudio, vídeo no computador)
**Limitação importante:** por segurança, um site **não consegue guardar nem abrir um caminho** como `C:\Pasta\arq.pdf`. Três caminhos:

| Opção | Como funciona | Prós | Contras |
|-------|---------------|------|---------|
| **A. Pasta-biblioteca** (File System Access API) | O usuário escolhe uma pasta uma vez; o app guarda no JSON só o caminho **relativo** | Nada vai para nuvem, fácil levar para outro PC | Hoje funciona principalmente em Chrome/Edge; precisa reautorizar às vezes |
| **B. Copiar para o navegador** (IndexedDB) | Arquivo copiado para o armazenamento interno do navegador | Funciona em mais navegadores | Duplica espaço, limite por navegador, some se limpar dados |
| **C. Só lembrar o nome** | Guarda o nome e pede para reapontar | Funciona em qualquer navegador | Pior experiência |

- **Recomendação:** **A como padrão** + **C como fallback**.
- Sua resposta: **ok** (você disse "concordo com suas respostas"; se quiser mudar alguma, é só avisar).

### DEC11. Onde fica a biblioteca do usuário
- **Recomendação:** lista de itens, tags e anotações no **IndexedDB**, com **exportar/importar `biblioteca.json`**. O JSON guarda links, caminhos relativos e metadados, **nunca o conteúdo dos arquivos**.
- Sua resposta: **ok** (você disse "concordo com suas respostas"; se quiser mudar alguma, é só avisar).

### DEC12. Biblioteca inicial curada
- **Recomendação:** o app vem com um `biblioteca-base.json` seu, e o usuário adiciona as dele por cima.
- Sua resposta: **ok** (você disse "concordo com suas respostas"; se quiser mudar alguma, é só avisar).

### DEC13. Público e idioma
- **Recomendação:** português (pt-BR) primeiro, textos em arquivo separado para traduzir depois.
- Sua resposta: **ok** (você disse "concordo com suas respostas"; se quiser mudar alguma, é só avisar).

### DEC14. Publicação
- **Recomendação:** hospedagem estática gratuita (GitHub Pages, Netlify ou Cloudflare Pages).
- Sua resposta: **ok** (você disse "concordo com suas respostas"; se quiser mudar alguma, é só avisar).

### DEC15. Plataforma alvo
- **Recomendação:** desktop primeiro, com layout responsivo e modo lista no celular.
- Sua resposta: **ok** (você disse "concordo com suas respostas"; se quiser mudar alguma, é só avisar).

### DEC16. Casa x prédio como contexto
- **Recomendação:** cada obra da fundação mostra, em cima, a construção que ela sustenta (casa ou prédio), conforme a coluna **Contexto**. Uma obra com dois contextos (ex.: sapata de divisa) mostra a casa na cena principal e o prédio como variante.
- Sua resposta: **ok** (você disse "concordo com suas respostas"; se quiser mudar alguma, é só avisar).

---

## 6. Processo por zona

Cada zona passa pelas mesmas etapas. O painel da seção 0 acompanha o andamento.

1. **Catálogo da zona**: você confirma quais obras entram e a prioridade (P)
2. **Fichas e sequência de etapas**: eu rascunho a cena, o corte, as máquinas, os rótulos e o tour; você define a **sequência de etapas** de cada obra (ex.: estaca: máquina chega → perfura → armação → concretagem → máquina sai). Eu estimo a complexidade de modelagem de cada obra (baixa, média ou alta)
3. **Modelagem inicial e primeira animação**: eu construo as peças e animo a sequência
4. **Conferência das etapas**: você confirma se estão todas as etapas daquele tema; eu ajusto
5. **Revisão final**: visual e desempenho
6. **Zona aprovada**: marca `[x]` no painel e passamos à próxima

Nenhuma obra do catálogo é descartada sem você decidir. O que não entra agora fica como P2 ou P3.

## 7. Arquitetura proposta

**Camadas** (a divisão do vídeo 2 ajuda a organizar):

| Camada | O que é | Pasta |
|--------|---------|-------|
| **Mundo** | Terreno, ruas, prédios, solo em camadas | `scene/`, `zones/` |
| **Vida** | Máquinas, operários, veículos em movimento | `kit/`, `works/` |
| **Interação** | Hover, clique, câmera, tour | `interaction/` |
| **Painel** | Repositório de estudo e interface | `ui/`, `storage/` |
| **Extras** | Dia/noite, clima, corte, qualidade gráfica | `section/` e outros |

**Stack**
- Three.js + Vite + JavaScript (TypeScript opcional)
- Pós-processamento: sombra de contato (AO), leve tilt-shift, bloom sutil
- UI do painel: HTML/CSS próprio, sem framework pesado no começo
- Dados: IndexedDB (ex.: `idb`) + exportação JSON
- Modelos: código (principal) + glTF/GLB com compressão (Draco ou Meshopt) para assets prontos

**Estrutura de pastas (sugestão)**

```
cidade-geotecnica/
├─ index.html
├─ src/
│  ├─ scene/        # cena, câmera, luzes, terreno, pós-processamento
│  ├─ zones/        # uma pasta por zona (tuneis, fundacao-direta, ...)
│  ├─ works/        # uma obra por arquivo (tbm.js, natm.js, sapata-corrida.js...)
│  ├─ kit/          # peças reutilizáveis (escavadeira, caminhão, operário...)
│  ├─ section/      # vista em corte do subsolo
│  ├─ interaction/  # hover, clique, câmera que voa até a obra, tour
│  ├─ ui/           # painel do repositório, modais
│  ├─ storage/      # IndexedDB, pasta-biblioteca, import/export JSON
│  └─ i18n/         # textos pt-BR
├─ public/models/   # GLB
└─ data/
   ├─ catalogo.json         # zonas e obras (as tabelas da seção 2, em formato de dados)
   └─ biblioteca-base.json  # referências curadas
```

**Modelo de dados (rascunho do JSON da biblioteca)**

```json
{
  "schemaVersion": 1,
  "zones": {
    "A-tuneis": { "items": [] }
  },
  "works": {
    "A1-tbm": {
      "items": [
        {
          "id": "uuid",
          "type": "video | article | document | photo | audio | link",
          "title": "Título do item",
          "source": "url | local",
          "url": "https://...",
          "local": { "relativePath": "tbm/norma.pdf", "fileName": "norma.pdf" },
          "tags": ["TBM", "aduelas"],
          "notes": "",
          "studied": false,
          "addedAt": "2026-10-15T16:00:00-03:00"
        }
      ]
    }
  }
}
```

O "handle" da pasta-biblioteca fica no IndexedDB, não no JSON (não é exportável). O JSON só carrega caminhos relativos. O catálogo de obras fica em `catalogo.json`, separado, para adicionar obras sem mexer no código.

---

## 8. Roadmap por fases

### Fase 0 — Planejamento (quase fechada)
- [ ] Confirmar os termos da seção 2.2
- [x] Responder as decisões DEC1 a DEC16
- [x] Catálogo confirmado nas 8 zonas (73 obras)
- [x] Direção de arte: estilo híbrido (argila + cor de destaque + solo colorido no corte)
- [ ] Fechar a Zona A (falta confirmar as sequências, seção 4.3)
- [ ] Rascunhar telas do painel do repositório e de adicionar item
- [ ] Fechar modelo de dados
- **Pronto quando:** estes itens fecharem, em paralelo com a Fase 1.

### Fase 1 — Cidade inicial + base técnica + Zona A (Túneis)

**1a — Cidade inicial (modelagem inicial)**
- [x] Projeto Vite + Three.js rodando
- [x] Diorama com terreno e laterais mostrando as camadas de solo
- [x] Câmera modo Explorar (estilo city builder)
- [x] Ciclo dia/noite
- [x] Cidade viva: ruas, carros, pessoas, árvores
- [x] As 8 zonas como bairros, cada uma com uma vinheta simples
- [x] Clique na zona: a câmera voa e abre um cartão com a lista de obras
- [x] Tour guiado básico (passos numerados)
- [ ] Teste de desempenho em notebook comum (medi só o peso da cena: ~600 chamadas de desenho e ~130 mil triângulos; falta você abrir no seu computador e me dizer se fluiu)

**1b — Zona A**
- [x] Vista em corte interativa (abre um entalhe no terreno, mostra o solo em camadas e o túnel por dentro; Esc ou "Sair do corte" volta)
- [x] Kit de peças da zona A (poço, escudo, cabeça de corte, rosca, macacos, erector, aduelas, graute, trem de apoio, correia)
- [x] **A1 TBM** modelada e animada com as 4 etapas; painel com etapas, pausa, velocidade 1×/2×/0,5× e rótulos
- [x] A2 NATM modelado e animado (você confirma as etapas)
- [ ] A5 Emboque modelado e animado (você confirma as etapas)
- [ ] Você confirma a sequência final da A1 (seção 4.2) depois de ver a animação
- **Pronto quando:** a cidade roda fluida, você aprova o visual e os três túneis estão animados.

### Fase 2 — Zona B (Fundação direta)
- [ ] Confirmar catálogo e fichas, modelar, animar, revisar

### Fase 3 — Zona C (Fundação profunda)
- [ ] Confirmar catálogo e fichas, modelar, animar, revisar

### Fase 4 — Zona D (Escavações e contenções)
- [x] D1 a D8, D10, D11 e D14 modeladas e animadas (você confirma as etapas)
- [ ] Demais obras da Zona D (prioridade 3): D9, D12, D15

### Fase 5 — Zona E (Vias e pavimentos)
- [x] E1 Pavimento asfáltico (flexível) animado em corte (v2.7)
- [x] E2, E4, E5 e E6 (prioridade 2) animados em corte (v2.8)
- [ ] E7 e E8 (prioridade 3)

### Fase 6 — Zona F (Obras de terra e encostas)
- [x] F5 (compactação), F2 (cortes), F3 (aterros), F4 (aterro sobre solo mole) e F1 (estabilidade de encostas) animados em corte (v2.9)
- [ ] F6, F7 e F9 (prioridade 3)
- [ ] Confirmar fichas e revisar

### Fase 7 — Zona G (Investigação e ensaios)
- [x] G1 (sondagem SPT) animada em corte (v3.1)
- [x] G3 (CPT) e G11 (piezômetro) animados em corte (v3.2)
- [x] G5 (vane test) animado em corte (v3.3)
- [x] G6 (ensaio de placa) animado em corte (v3.4)
- [x] G7 (prova de carga em estaca) animada em corte (v3.5)
- [x] G8 (ensaio dinâmico PDA) animado em corte (v3.6)
- [x] G9 (integridade PIT) animado em corte (v3.7)
- [x] G10 (monitoramento de recalques) animado em corte (v3.8)
- [x] G4 (CPTU) animado em corte (v3.9)
- [x] G2 (sondagem rotativa) animado em corte (v3.10)
- [x] G12 (inclinômetro) animado em corte (v3.11)
- [ ] G13 (laboratório, edifício-ícone sem animação), confirmar fichas e revisar

### Fase 8 — Zona H (Barragens e disposição de rejeitos)
- [x] H1 (barragem de terra zonada) e H4 (pilha de rejeitos) animadas em corte (v3.0)
- [ ] Prioridade 3 (H2, H3, H5, H6), confirmar fichas e revisar

### Fase 9 — Cidade unificada
- [ ] Juntar as zonas numa cidade só (ruas, trânsito ambiente, pedestres)
- [ ] Tela de carregamento
- [ ] Clima (chuva) para os temas de fenômeno
- **Pronto quando:** a cidade "vive" com todas as zonas e se mantém fluida.

### Fase 10 — Interação
- [ ] Destaque ao passar o mouse na obra
- [ ] Clique: câmera voa até a obra
- [ ] Modo tour guiado com passos e cartão de texto
- [ ] Botão de vista em corte
- [ ] Rótulos educativos (hotspots) com texto e fotos
- [ ] Painel lateral abre (ainda vazio)
- [ ] Voltar à visão geral
- **Pronto quando:** navegar entre as obras é agradável e óbvio.

### Fase 11 — Repositório com links
- [ ] Adicionar/editar/remover item (tipo, título, URL, tags, notas)
- [ ] Abas/filtros por tipo + busca
- [ ] YouTube embutido; Drive e artigos em nova aba
- [ ] Marcar como estudado + progresso por obra/zona
- [ ] Salvar no IndexedDB
- [ ] Exportar a biblioteca como **lista organizada por zona → obra → itens** (para ler ou imprimir) e como `biblioteca.json` (backup e importação)
- [ ] Carregar `biblioteca-base.json`
- **Pronto quando:** dá para montar uma biblioteca de estudo só com links, salvar e restaurar.

### Fase 12 — Arquivos locais
- [ ] Escolher pasta-biblioteca (uma vez)
- [ ] Adicionar arquivo local e registrar caminho relativo
- [ ] Abrir PDF/imagem/áudio/vídeo dentro do app
- [ ] Reautorização de permissão sem dor
- [ ] Fallback para navegadores sem suporte
- **Pronto quando:** abrir um arquivo local de um item funciona em dois cliques.

### Fase 13 — Polimento e publicação
- [ ] Revisão de design e microinterações
- [ ] Tour de boas-vindas e estados vazios bem desenhados
- [ ] Modo lista, teclado e acessibilidade
- [ ] Níveis de qualidade gráfica e otimização
- [ ] Deploy estático gratuito
- [ ] PWA/offline (decidido)
- [ ] Feedback de usuários e backlog da v2

---

## 9. Referências visuais e técnicas

### Vídeo 1 — `Video_by_w.wearebrand` (site de uma empresa de logística)
Vi só as imagens do vídeo, sem áudio. Parece um site WebGL; não consigo confirmar que é Three.js.

**O que observei**
- Cenas isométricas em estilo **maquete branca**, com **uma única cor de destaque** (a cor da marca)
- Sequência de cenas: armazém **em corte** (mostra as prateleiras por dentro), estrada serpenteando em colinas verdes, porto com navios e guindastes, pátio ferroviário com pórtico, prédio de escritórios
- **Navegação por passos numerados** na parte de baixo e um **cartão de texto translúcido** à esquerda; a câmera viaja entre as cenas
- Vida na cena: caminhões, trens, navios, pessoas minúsculas e árvores simples
- No fim, a cena dá lugar a uma página de conteúdo com números

**O que levamos para o projeto:** o armazém em corte valida a nossa **vista em corte**; os passos numerados viram o **tour guiado** (DEC3); o estilo argila com cor de destaque inspira o **estilo híbrido** (DEC2).

### Vídeo 2 — `Video_by_sanjai.builds` (tutorial)
- Mostra um painel 3D isométrico (armazém, aeroporto, lançamento de foguete) feito com Claude num **único arquivo HTML com Three.js via CDN**, como aparece no prompt do vídeo
- Organiza o projeto em 5 camadas: **World** (o lugar), **Life** (a simulação), **Interaction** (a sensação de jogo), **Dashboard** (a interface), **Extras** (o "uau")
- Mostra rotas em movimento e marcadores clicáveis sobre a cena

**O que levamos para o projeto:** confirma que a tecnologia (DEC1) dá conta; as 5 camadas viraram a divisão da seção 7.

**Nota:** vamos nos inspirar nos estilos, sem copiar a marca, as cores nem os modelos desses vídeos.

### Outras referências
(Cole aqui outros links)

-
-

---

## 10. Perguntas abertas

- [ ] Qual o nome do app?
- [ ] Ele é só para você ou para outros estudantes?
- [ ] **Barragens (H1):** quais variantes você quer? Terra homogênea, zoneada, enrocamento, concreto? A "barragem de rejeitos" já está em H3.
- [ ] **Cidade inicial:** abra o protótipo e me diga o que mudar no visual, nas cores, no tamanho das colinas e nas máquinas
- [ ] **Termos da seção 2.2:** confirmar os que ainda estão sem marca
- [ ] **"Fotos também pode ter":** entendi que os rótulos educativos (hotspots) podem mostrar fotos. É isso?
- [ ] **"Anotações visuais":** entendi como notas de texto do usuário em cada item. Se você quis dizer algo sobre imagens (anotar em cima de uma foto, por exemplo), me explique.
- [ ] **Sequências da Zona A** (seção 4.3)
- [ ] Falta alguma obra ou tema que você tem em mente, em qualquer zona?

## 11. Log de decisões

| Data | Decisão | Observação |
|------|---------|------------|
| 15/10/2026 | Roadmap v0.1 criado | Estrutura inicial e decisões DEC1 a DEC11 |
| 15/10/2026 | v0.2: catálogo de obras (~37); estilo Cities: Skylines; vista em corte como diferencial | Aguardando confirmação |
| 15/10/2026 | v0.3: zonas reorganizadas por você (A Túneis, B Fundação direta, C Fundação profunda, D Escavações e contenções, E Vias e pavimentos, F Obras de terra, G Investigação e ensaios); catálogo passou para 51 obras; casa x prédio virou "contexto"; processo zona por zona; ondas viraram prioridade (P) dentro de cada zona; referências dos 2 vídeos analisadas | Aguardando decisões DEC1 a DEC16 e fechamento da Zona A |
| 15/10/2026 | v0.4: **zona H (Barragens e disposição de rejeitos)** criada; checklist TXT incorporado (seção 2.4 mostra onde está cada item); catálogo passou de 51 para 81 obras; secantes/tangentes foram para a Zona D e blocos de coroamento para a Zona C; marcador "fenômeno" para temas que não são obras; decisões renomeadas para DEC1 a DEC16 (para não confundir com as obras D1 a D15) | Aguardando DEC1 a DEC16, confirmações da seção 2.4 e fechamento da Zona A |
| 15/10/2026 | v0.5: respostas por zona aplicadas (catálogo de 81 para **73 obras**; retiradas A3, A4, A6, A7, C16, D13, E3, F8; todas as demais sugestões confirmadas); Zona A = TBM, NATM e **Emboque em encosta (A5)**; C17 virou "Ponte com fundação em rio" (tipo de fundação a definir); G13 virou "Laboratório" (edifício-ícone, sem animação de obra); ideias aceitas, **estudado/progresso fica para a v2**, **comparar obras descartado**; PWA e exportação em lista decididos; DEC1 a DEC5 respondidas e DEC6 a DEC16 aceitas ("concordo com suas respostas"); drenagem continua espalhada (D15, E7, F9, G11) e as mudanças de secantes, tangentes e blocos foram aceitas sem objeção; **Fase 1a (cidade inicial) iniciada** | Aguardando as sequências da Zona A e as perguntas da seção 10 |
| 15/10/2026 | v0.6: **cidade inicial publicada** (Fase 1a): diorama com corte de solo nas laterais, 8 bairros com vinhetas animadas (portal e gantry em A, casas e fundações em B, prédio, guindaste e perfuratriz em C, escavação escorada em D, rolos e pavimentadora em E, encosta em bancadas em F, laboratório e sondagens em G, barragem e pilha de rejeitos em H), carros, pessoas, árvores, câmera Explorar, Tour guiado, clique na zona com painel de obras do catálogo, ciclo dia/noite, modo escuro e celular | Aguardando seu feedback do visual e as sequências da Zona A |
| 16/10/2026 | v0.7: **vista em corte e A1 (TBM) animada** (Fase 1b parcial): entalhe interativo no terreno, camadas de solo e lençol, poço, TBM com cabeça de corte giratória, câmara, rosca, macacos, erector, aduelas montadas uma a uma, graute, trem de apoio e correia; painel com as 4 etapas, pausa, velocidade e rótulos; funciona no celular; dois túneis separados confirmados por você | Aguardando sua confirmação da sequência da A1 e as etapas de A2 e A5 |
| 17/10/2026 | v0.8: **A2 (NATM) animada em corte**: calota, bancada e inverso escavados em etapas, escavadeira, caminhão de marinha, robô de concreto projetado, cambotas, chumbadores e alvos de convergência; colina com portal em bancadas e camadas do maciço; painel e rótulos generalizados para várias obras | Aguardando sua confirmação das sequências de A1 e A2; A5 em seguida |
| 17/10/2026 | v0.9: **A5 (emboque) animado em corte**: escavação do talude em 4 lances de cima para baixo (terreno dinâmico), grampos, concreto projetado, superfície de ruptura, enfilagens em arco e início do túnel sob o guarda-chuva; perfil do portal com 3 bancadas; painel mostra o lance atual; Zona A completa | Aguardando sua confirmação das sequências de A1, A2 e A5 e do perfil do talude |
| 17/10/2026 | v1.0: **marcos de recalque na A1**; **rascunho da Zona B** (seção 4B) com sequências propostas para B1 a B6; Zona A fechada na animação, falta sua confirmação das sequências | Aguardando suas correções das sequências de A1, A2, A5 e da Zona B |
| 18/10/2026 | v1.1: **Zona B iniciada: B2 (sapata corrida) e B4 (radier) animadas em corte** com terreno escavado dinamicamente, peças com seção desenhada, máquinas, bulbo de tensões na B2 e cura na B4; novo kit compartilhado para as fundações | Aguardando sua confirmação das sequências da Zona B (seção 4B) e do bulbo; B1, B5, B3 e B6 em seguida |
| 18/10/2026 | v1.2: **B1 (sapata isolada) e B5 (sapata associada) animadas em corte**, com pilares, arranques, cargas e bulbos (um por pilar mais o envelope somado na B5); correção do piso da cava que não era cortado na B4; B3 e B6 por fazer | Aguardando suas correções das sequências da Zona B; B3 e B6 em seguida |
| 18/10/2026 | v1.3: **B3 (sapata de divisa) e B6 (melhoria do solo) animadas em corte**; Zona B completa na animação (B1 a B6) | Aguardando sua confirmação das sequências da Zona B (seção 4B) e do bulbo; depois, Zona C (fundação profunda) |
| 18/10/2026 | v1.4: **Zona C iniciada: C4 (estaca hélice contínua) animada em corte** com perfuratriz, hélice, bomba, gaiola e guindaste; rascunho das sequências da Zona C (seção 4C) | Aguardando suas correções da Zona B e da Zona C (seção 4C) |
| 18/10/2026 | v1.5: **C6 (estaca pré-moldada cravada) e C7 (estaca metálica) animadas em corte**, com martelo, emenda soldada e nega | Aguardando suas correções das sequências das Zonas B e C; próximas: C2, C3, C14 |
| 18/10/2026 | v1.6: **C2 (tubulão a céu aberto) animado em corte**, com camisa de concreto, campana e inspeção da base | Aguardando suas correções das sequências B e C; próximas: C3, C14 |
| 19/10/2026 | v1.7: **C3 (estaca escavada com trado mecanizado) animada em corte**, com ciclos de trado, limpeza do fundo, gaiola com espaçadores e concretagem por tremonha | Aguardando suas correções das sequências B e C; próxima: C14 |
| 19/10/2026 | v1.8: **C14 (bloco de coroamento) animado em corte**, com arrasamento das estacas, fôrmas, armação com arranques e concretagem com vibrador | Aguardando suas correções das sequências B e C; restam C1, C13 e as de prioridade 3 da Zona C |
| 19/10/2026 | v1.9: **C1 (estaca broca) animada em corte**, com trado manual, carrinho de mão e viga baldrame | Aguardando suas correções das sequências B e C; restam C13 e as de prioridade 3 da Zona C |
| 19/10/2026 | v2.0: **C13 (estacão/barrete com lama bentonítica) animado em corte**, com clamshell, gaiola em dois trechos e tubos de concretagem | Zona C: restam só as de prioridade 3 (C5, C8–C12, C15, C17); C13 serve de base para D6 |
| 19/10/2026 | v2.1: **Zona D iniciada: D1 (escavação urbana com cortina de estacas e escoras) e D5 (cortina atirantada) animadas em corte**, com prédio vizinho aberto, rua, guindaste com caçamba, perfuratrizes inclinadas e protensão; a cava estática da vista geral virou um grupo que some quando uma obra da Zona D entra | Aguardando suas correções das sequências B, C e D; próxima: D6 (parede diafragma), depois D2, D3, D4, D7, D8, D10, D11, D14 |
| 22/10/2026 | v2.2: **D6 (parede diafragma) animada em corte**, com muretas-guia, clamshell e lama, gaiola em dois trechos, concretagem, painéis vizinhos, viga de coroamento e escavação até 11 m com 3 níveis de escoras | Aguardando suas correções das sequências B, C e D; próximas: D2, D3, D4, D7, D8, D10, D11, D14 |
| 22/10/2026 | v2.3: **D2 (estacas secantes), D3 (estacas tangentes) e D4 (cortina em balanço) animadas em corte**; cava, guindaste e escoras da Zona D agora num kit comum | Aguardando suas correções das sequências B, C e D; próximas: D7, D8, D10, D11, D14 |
| 23/10/2026 | v2.4: **D7 (solo grampeado) animado em corte**, com 4 etapas de escavação, furação inclinada, grampos com calda e concreto projetado | Aguardando suas correções das sequências B, C e D; próximas: D8, D10, D11, D14 |
| 23/10/2026 | v2.5: **D8 (muro de gravidade), D10 (muro por flexão) e D11 (gabião) animados em corte**, com aterro compactado em camadas, dreno e armadura no corte | Aguardando suas correções das sequências B, C e D; próxima: D14 (vala urbana escorada) e depois as de prioridade 3 |
| 23/10/2026 | v2.6: **D14 (vala urbana escorada) animada em corte**, com blindagem metálica, caminhão com guindaste, reaterro em camadas e reposição do pavimento. **Zona D de prioridade 2 completa** | Aguardando suas correções das sequências B, C e D; próxima: Zona E |
| 25/10/2026 | v2.7: **E1 (pavimento asfáltico) animado em corte**, com caixa, subleito, sub-base, base, imprimação, binder e capa, e máquinas (motoniveladora, caminhão-pipa, distribuidor, vibroacabadora, rolo) | Aguardando suas correções das sequências B, C, D e E1; próximas: E2, E5, E6, E4 |
| 02/11/2026 | v2.8: **E2 (pavimento rígido), E4 (corte e aterro), E5 (reforço com fresagem) e E6 (geossintéticos) animados em corte.** Zona E de prioridade 2 completa | Aguardando suas correções das sequências B, C, D e E; próximas: E7 e E8 (prioridade 3) ou Zona F |
| 03/11/2026 | v2.9: **Zona F de prioridade 1 e 2 animada em corte: F5 (compactação com painel Proctor), F2 (cortes em solo e rocha, com detonação), F3 (aterros em camadas), F4 (aterro sobre solo mole com drenos verticais e gráfico de recalque) e F1 (estabilidade de encostas: chuva, ruptura circular e estabilização).** Motor de perfil comum às obras de terra; projeto passa a ter repositório no GitHub | Aguardando suas correções das sequências B, C, D, E e F; próximas: Zona G (G1) e Zona H (H1, H4) |
| 04/11/2026 | v3.0: **Zona H: H1 (barragem de terra zonada, com percolação e enchimento do reservatório) e H4 (pilha de rejeitos em bancos compactados, com drenagem e monitoramento) animadas em corte** | Aguardando suas correções; próximas: G1 (sondagem SPT), depois prioridade 3 |
| 04/11/2026 | v3.1: **G1 (sondagem SPT) animada em corte**, com tripé, martelo, contagem de golpes por trecho, gráfico e tabela de NSPT, amostras e nível d'água | Aguardando suas correções; próximas: prioridade 3 das zonas C, D, E, F, G e H |
| 04/11/2026 | v3.2: **G3 (ensaio CPT, com curvas de qc e Rf) e G11 (piezômetro, com gráfico de chuva e nível d'água e diagrama de poropressão) animados em corte** | Aguardando suas correções; próximas: G2, G4 a G10 e demais prioridades 3 |
| 05/11/2026 | v3.3: **G5 (vane test) animado em corte**, com curva su x rotação, resistência remoldada, sensibilidade e perfil de su | Aguardando suas correções; próximas: G2, G4, G6 a G10 |
| 05/11/2026 | v3.4: **G6 (ensaio de placa) animado em corte**, com cava, tirantes, bulbo de tensões, curva carga x recalque e tensão admissível | Aguardando suas correções; próximas: G2, G4, G7 a G10 |
| 05/11/2026 | v3.5: **G7 (prova de carga estática em estaca) animada em corte**, com estacas de reação, diagrama de transferência de carga e curva carga x recalque | Aguardando suas correções; próximas: G2, G4, G8 a G10 |
| 05/11/2026 | v3.6: **G8 (ensaio dinâmico PDA) animado em corte**, com guindaste, sensores, onda de tensão e sinais de força e velocidade | Aguardando suas correções; próximas: G2, G4, G9, G10 |
| 06/11/2026 | v3.7: **G9 (ensaio de integridade PIT) animado em corte**, com duas estacas (íntegra e com estrangulamento) e reflectogramas | Aguardando suas correções; próximas: G2, G4, G10, G12, G13 |
| 06/11/2026 | v3.8: **G10 (monitoramento de recalques de fundações) animado em corte**, com sapatas, pinos, nível ótico, mira e gráfico recalque x tempo com recalque diferencial | Aguardando suas correções; próximas: G2, G4, G12, G13 |
| 06/11/2026 | v3.9: **G4 (CPTU, piezocone) animado em corte**, com perfis de qc, u2 e Rf, reta hidrostática e nível d'água | Aguardando suas correções; próximas: G2, G12, G13 |
| 06/11/2026 | v3.10: **G2 (sondagem rotativa) animado em corte**, com revestimento, barrilete duplo, caixa de testemunhos e boletim de REC e RQD | Aguardando suas correções; próximas: G12, G13 |
| 06/11/2026 | v3.11: **G12 (inclinômetro) animado em corte**, ao pé de um aterro em três etapas sobre a argila, com tubo-guia, calda, torpedo, leituras e gráfico deslocamento x profundidade. Site publicado no GitHub Pages e README com prints | Aguardando suas correções; próxima: G13 (laboratório) ou as P3 da Zona H (H2, H3, H5, H6) |
| 06/11/2026 | v3.12: **novo mapa**: rio atrás da cidade, **área afastada** do outro lado com as zonas F e H (todas as obras F1 a F5, H1 e H4 deslocadas e testadas em corte), **túnel** saindo da Zona A por baixo do rio até um portal na área afastada, e **ponte** perto da Zona D; antigos lotes de F e H viram quarteirão e praça | Aguardando sua avaliação do mapa; próxima: C17 na ponte, G13 ou as P3 da Zona H |
| 06/11/2026 | v3.13: **C e D ampliadas** (quadras contínuas, ruas entre as metades removidas), **Zona E na avenida central** alargada (obras giradas para correr ao longo dela), antigo lote de E virou quarteirão, **Zona I (Geotecnia ambiental)** com aterro sanitário ao lado da saída do túnel e **Zona J (reservada)** na chegada da ponte | Aguardando: confirmar obras da Zona I e o que entra na J; próxima: I1 em corte ou C17 |
| 06/11/2026 | v3.14: **C deitada** na fileira da frente (antigo lote de E), avenida central termina em T na rua do meio; **A ampliada** para a direita e **faixa da Zona E** com usina de asfalto no antigo lote de trás da C | Aguardando sua avaliação do mapa; próxima: I1 em corte ou C17 |
| 06/11/2026 | v3.15: **Zona J = Pontes e obras em rio** (C17 virou J1, nova J2 Ensecadeira), ensecadeira no rio e pátio de vigas; na cava da D, escoras mais altas e escavadeiras compactas trabalhando por baixo delas | Próxima: J1/J2 ou I1 em corte |
| 06/11/2026 | v3.16: **J2 (ensecadeira) animada em corte** no rio ao lado da ponte, com cravação, selo submerso, esgotamento com escoras, equilíbrio do selo, bloco e pilar a seco e extração; GitHub Pages religado | Aguardando suas correções; próxima: J1 (fundação do pilar da ponte) ou I1 |
