# MEMORIX — jogo de memória retrofuturista (React + Express + PostgreSQL)

Jogo de sequências de cores inspirado nos fliperamas dos anos 80/90, com visual neon/cyberpunk.
Projeto full-stack para a feira de ciências do curso Técnico em Desenvolvimento de Sistemas.

- **Frontend:** React, TypeScript, Vite, Tailwind CSS v4, React Router, Lucide React
- **Backend:** Node.js, Express, TypeScript, Zod, `pg` (consultas parametrizadas)
- **Banco:** PostgreSQL (`banco_memorix`), administrado pelo pgAdmin 4
- **Testes:** Vitest (frontend e backend) e Supertest (API)

## 1. Estrutura

```
memorix/
├── backend/   src/{routes,controllers,services,repositories,middlewares,validators,database,types,utils}  tests/
├── frontend/  src/{components,pages,layouts,hooks,services,types,utils,styles}  tests/
├── database/  schema.sql
└── README.md
```

## 2. Pré-requisitos

Node.js 20+ (testado com 22), PostgreSQL 13+ e pgAdmin 4.

## 3. Banco de dados no pgAdmin 4 (passo a passo)

1. **Abrir o pgAdmin 4** pelo menu Iniciar. Informe a *master password* do pgAdmin se pedir.
2. **Conectar ao servidor:** no painel esquerdo, expanda *Servers* e clique em *PostgreSQL xx*. Digite a senha do usuário `postgres` definida na instalação.
3. **Criar o banco:** botão direito em *Databases* → *Create* → *Database…* → nome **`banco_memorix`** → *Save*.
4. **Abrir o Query Tool:** clique em `banco_memorix` e use *Tools → Query Tool* (ou o ícone de raio/SQL).
5. **Executar o script:** *File → Open File…* e escolha `database/schema.sql` (ou cole o conteúdo) e aperte **F5**. Deve aparecer *Query returned successfully*.
6. **Verificar as tabelas:** em `banco_memorix → Schemas → public → Tables` (botão direito → *Refresh*) devem existir `players`, `games`, `game_levels` e `game_events`. Teste com `SELECT * FROM games;`.
7. **Configurar o backend:** `cd backend && cp .env.example .env` e edite `PGPASSWORD` (e `PGUSER`/`PGHOST`/`PGPORT` se forem diferentes). Nunca coloque a senha no código nem envie o `.env` ao Git.
8. **Testar a conexão:** com o backend rodando, abra `http://localhost:3333/api/health`. Esperado: `{"status":"ok","database":"up",...}`. Se o banco estiver fora do ar a resposta é `503 DB_UNAVAILABLE`.

> `gen_random_uuid()` exige PostgreSQL 13+. Em versões anteriores, rode antes `CREATE EXTENSION pgcrypto;`.

## 4. Instalação e execução

```bash
# Backend (terminal 1)
cd backend
npm install
cp .env.example .env      # edite a senha
npm run dev               # http://localhost:3333

# Frontend (terminal 2)
cd frontend
npm install
npm run dev               # http://localhost:5173  (também acessível pela rede local)
```

Em desenvolvimento o Vite repassa `/api` ao backend, então celulares que acessam `http://IP-DO-NOTEBOOK:5173` não precisam de configuração de CORS.

## 5. Testes

```bash
cd backend  && npm test        # regras, serviço, API (Supertest)
cd frontend && npm test        # máquina de estados e utilitários
```

Teste de integração com o PostgreSQL real (opcional, **apaga as tabelas do banco indicado**): crie um banco `banco_memorix_test`, aplique o `schema.sql` nele e rode:

```bash
TEST_DATABASE_URL=postgres://postgres:SENHA@localhost:5432/banco_memorix_test npm test
```

Sem essa variável os testes de PostgreSQL são ignorados (o repositório em memória só existe para os testes).

## 6. Regras do jogo

| Nível | Cores na sequência | Tempo aceso / intervalo |
|---|---|---|
| 1 | 4 | 650 ms / 280 ms |
| 2 | 5 | 590 ms / 250 ms |
| 3 | 6 | 530 ms / 225 ms |
| 4 | 7 | 480 ms / 200 ms |
| 5 | 8 | 430 ms / 180 ms |

- Cada nível começa com **3 vidas**. Erro = −1 vida e a **mesma** sequência é reproduzida de novo. Zero vidas = partida encerrada (`failed`).
- Ao avançar de nível as vidas voltam a 3 (não acumulam). Sequências são sorteadas no servidor com `crypto.randomInt`.
- Estados no cliente: `idle → playing_sequence → awaiting_input → processing → wrong | level_complete | finished`. Ações inválidas são ignoradas. A pausa **não** foi implementada.

### Fórmula de pontuação (calculada no servidor)

```
pontos do nível = 100 × número do nível + 50 × vidas restantes (0 a 3)
bônus final     = +500 ao concluir o nível 5
```
Nível não concluído não pontua. Máximo possível: 1500 + 750 + 500 = **2750**. Os pontos de níveis já concluídos são mantidos ao perder.

### Regras do ranking

Ordem: (1) maior nível alcançado, (2) maior pontuação, (3) menor tempo em ms, (4) registro mais antigo (desempate final por id). Entram todas as partidas finalizadas — `completed`, `failed` e `abandoned` (as duas últimas aparecem como **INCOMPLETA**). Partidas `in_progress` não entram. A ordem usa o mesmo `ORDER BY` na consulta, no cálculo de posição e no índice `ix_games_ranking`.

## 7. Tempo, segurança e limitações

- **Cronômetro:** na tela, usa `Date.now()` (timestamps), não contadores. O tempo **oficial** é `finished_at − started_at` medido pelo **servidor**; o cliente nunca envia duração.
- **Identificação sem senha:** ao iniciar, o servidor gera um token aleatório (devolvido uma única vez) e guarda só o hash SHA-256. Jogadas e abandono exigem o header `x-game-token`. Consultar um resultado (`GET /api/games/:id`) é público e não expõe token nem sequência.
- **Antifraude:** o servidor valida a jogada contra a sequência guardada, calcula vidas/nível/pontos, ignora campos extras enviados pelo cliente, exige `attemptNumber` em ordem (reenvio duplicado → 409), usa transação com `SELECT … FOR UPDATE` e recusa jogadas depois do fim. Jogadas mais rápidas que 300 ms × tamanho da sequência são rejeitadas.
- **Limites (importante):** a sequência precisa ser enviada ao navegador para ser exibida; quem inspecionar a rede pode vê-la, e um bot pode jogar “perfeitamente” respeitando o ritmo mínimo. O apelido não é autenticado — qualquer pessoa pode usar o apelido de outra. Os limites validam a *consistência* do resultado, não impedem trapaça sofisticada. Para uma feira, isso é aceitável; anuncie o ranking como “não oficial”.
- Outras proteções: Zod nas entradas, SQL parametrizado, Helmet, CORS por lista, limite de requisições por IP (`RATE_LIMIT_PER_MINUTE`), corpo JSON limitado a 10 KB, erro 503 se o banco cair, mensagens padronizadas `{ "error": { code, message } }`.
- Partidas iniciadas e nunca finalizadas (aba fechada) ficam como `in_progress` e não aparecem no ranking.
- Recarregar a tela do jogo perde a partida em andamento (a página de **resultado** pode ser recarregada à vontade e nunca cria partida nova).

## 8. API REST

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/health` | Estado da API e do banco |
| POST | `/api/games/start` | `{ nickname }` → `{ gameId, token, level, livesRemaining, sequence, attemptNumber }` |
| POST | `/api/games/:id/attempt` | Header `x-game-token`; `{ input: number[], attemptNumber }` → `{ outcome, pointsEarned, game, sequence?, level, livesRemaining, attemptNumber }` (`outcome`: `retry`, `level_up`, `victory`, `game_over`) |
| POST | `/api/games/:id/abandon` | Header `x-game-token`; registra partida incompleta |
| GET | `/api/games/:id` | Resultado público (inclui posição no ranking) |
| GET | `/api/ranking?page=1&pageSize=10` | Ranking paginado (máx. 50 por página) |
| GET | `/api/statistics` | Totais, taxa de conclusão, recordes, apelidos distintos |

Cores: `0` verde, `1` magenta, `2` ciano, `3` amarelo. O endpoint `GET /api/games` (lista) foi omitido de propósito: o ranking já cumpre esse papel.

## 9. Problemas comuns

| Sintoma | Solução |
|---|---|
| `password authentication failed` | Senha errada no `backend/.env`; confira no pgAdmin. |
| `database "banco_memorix" does not exist` | Crie o banco (passo 3 da seção 3). |
| `relation "games" does not exist` | Execute `database/schema.sql` no banco certo. |
| `function gen_random_uuid() does not exist` | PostgreSQL < 13: `CREATE EXTENSION pgcrypto;`. |
| Home mostra “offline” | Backend desligado ou porta diferente de 3333. |
| Celular não abre o site | Mesmo Wi-Fi, use o IP do notebook, libere as portas 5173/3333 no firewall. |
| Sem som no celular | O navegador só libera áudio após um toque; verifique o botão SOM. |

## 10. Preparação para a feira

1. Faça `npm run build` no frontend e teste com `npm run preview`; ou deixe o `npm run dev` rodando.
2. Teste em pelo menos um celular e um tablet reais, com o notebook como servidor de Wi-Fi/hotspot.
3. Jogue 2–3 partidas completas e uma perdida antes do evento; confira o ranking no pgAdmin (`SELECT * FROM games ORDER BY created_at DESC;`).
4. Faça backup do banco (pgAdmin → botão direito em `banco_memorix` → *Backup…*). Para zerar o ranking antes de abrir ao público: `TRUNCATE game_events, game_levels, games, players RESTART IDENTITY CASCADE;`.
5. Deixe o notebook na tomada, desative suspensão de tela e feche outros programas.
6. Tenha um plano B: print do ranking e este README com o passo a passo de reinício.
