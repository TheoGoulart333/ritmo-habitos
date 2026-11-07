# Ritmo

Um projeto pessoal para acompanhar hábitos sem transformar a rotina em uma lista impossível. No Ritmo, você escolhe o que quer praticar, marca os dias em que conseguiu e acompanha a semana com clareza.

## O que dá para fazer

- Criar hábitos com nome, símbolo e cor.
- Marcar ou desmarcar os dias concluídos.
- Ver o progresso de hoje e da semana.
- Voltar a semanas anteriores para consultar seu histórico.
- Guardar os dados em um arquivo JSON por meio de uma API local.
- Usar a interface em computadores e celulares.

## Como rodar

Você precisa do [Node.js](https://nodejs.org/) 18 ou mais recente. Clone o repositório, entre na pasta do projeto e inicie o servidor:

```bash
git clone https://github.com/TheoGoulart333/ritmo-habitos.git
cd ritmo-habitos
npm start
```

Abra [http://127.0.0.1:3000](http://127.0.0.1:3000) no navegador. O servidor cria `data/habits.json` automaticamente na primeira vez que a API é usada.

Também é possível iniciar diretamente com `node server.js`.

## Como funciona

O projeto usa HTML, CSS e JavaScript no navegador, sem frameworks. O backend foi feito com Node.js e módulos nativos, sem instalar pacotes extras. A API oferece:

- `GET /api/habits` para carregar os hábitos.
- `PUT /api/habits` para salvar os hábitos.

Os dados ficam em `data/habits.json`, um arquivo local que não deve ser enviado ao GitHub. Se o servidor não estiver disponível, a interface ainda consegue guardar dados no armazenamento local do navegador.

## Tecnologias

- HTML5
- CSS3
- JavaScript
- Node.js (módulos nativos)
- JSON para persistência local

## Um detalhe sobre o backend

Este é um backend simples para aprendizado e uso local. Ele não tem login, banco de dados remoto nem separação de dados entre usuários. Para publicar o app para outras pessoas usarem, seria necessário adicionar autenticação e uma base de dados apropriada.

## Próximos passos possíveis

- Permitir editar hábitos existentes.
- Adicionar metas e lembretes.
- Criar contas e sincronização entre dispositivos.
- Incluir testes automatizados para a API.

Feito com atenção aos pequenos passos.
