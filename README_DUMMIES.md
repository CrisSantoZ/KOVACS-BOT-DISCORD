# Sistema de Sacos de Pancada (Dummies) - Arcádia RPG

## Visão Geral

O sistema de sacos de pancada permite que administradores criem alvos de treino para os jogadores testarem suas habilidades de combate e magia. Os dummies são entidades persistentes que podem ser atacadas pelos jogadores sem risco de morte.

## Funcionalidades Implementadas

### 1. Comandos de Admin

#### `/admincriardummy`
Cria um novo saco de pancada com configurações personalizáveis.

**Parâmetros:**
- `nome` (obrigatório): Nome único do dummy
- `nivel` (opcional): Nível do dummy (padrão: 1)
- `pv` (opcional): Pontos de vida máximos (padrão: calculado pelo tipo)
- `pm` (opcional): Pontos de mana máximos (padrão: calculado pelo tipo)
- `contraataca` (opcional): Se o dummy contra-ataca (padrão: false)
- `tipo` (opcional): Tipo do dummy (básico, resistente, mágico, etc.)

**Exemplo:**
```
/admincriardummy nome:Boneco de Treino nivel:5 pv:200 contraataca:true tipo:resistente
```

#### `/adminremoverdummy`
Remove ou reseta um saco de pancada existente.

**Parâmetros:**
- `nome` (obrigatório): Nome do dummy a ser removido/resetado
- `resetar` (opcional): Se true, apenas reseta PV/PM; se false, remove permanentemente

**Exemplos:**
```
/adminremoverdummy nome:Boneco de Treino resetar:true    # Reseta o dummy
/adminremoverdummy nome:Boneco de Treino resetar:false   # Remove permanentemente
```

#### `/adminlistardummies`
Lista todos os sacos de pancada ativos no servidor.

**Exemplo:**
```
/adminlistardummies
```

### 2. Tipos de Dummies Disponíveis

Os tipos são definidos no arquivo `dados/dummies.js`:

- **básico**: Dummy padrão com estatísticas equilibradas
- **resistente**: Dummy com alta defesa e PV
- **mágico**: Dummy com alta resistência mágica e PM
- **ágil**: Dummy com alta agilidade
- **fraco**: Dummy com estatísticas baixas para iniciantes

### 3. Integração com Sistema de Combate

Os dummies são integrados ao sistema de combate existente, permitindo que jogadores:
- Ataquem dummies com armas
- Usem feitiços contra dummies
- Testem combos e estratégias
- Pratiquem sem risco de morte

## Arquivos Modificados/Criados

### Novos Arquivos:
- `dados/dummies.js` - Definições e lógica dos tipos de dummies

### Arquivos Modificados:
- `arcadia_sistema.js` - Adicionadas funções de admin para dummies
- `index.js` - Adicionados handlers para comandos de admin
- `deploy-commands.js` - Adicionados comandos de dummy

## Configuração do Banco de Dados

O sistema cria automaticamente uma nova coleção no MongoDB:
- **Coleção**: `dummies_arcadia`
- **Estrutura**: Baseada no modelo definido em `dados/dummies.js`

## Como Usar

### Para Administradores:

1. **Criar um dummy básico:**
   ```
   /admincriardummy nome:Alvo de Treino
   ```

2. **Criar um dummy personalizado:**
   ```
   /admincriardummy nome:Boss de Treino nivel:10 pv:500 pm:200 contraataca:true tipo:resistente
   ```

3. **Resetar um dummy após uso:**
   ```
   /adminremoverdummy nome:Alvo de Treino resetar:true
   ```

4. **Ver todos os dummies ativos:**
   ```
   /adminlistardummies
   ```

### Para Jogadores:

Os jogadores podem interagir com dummies usando os comandos normais de combate:
- `/usarfeitico` - Para atacar com magia
- Comandos de ataque físico (quando implementados)

## Benefícios do Sistema

1. **Treino Seguro**: Jogadores podem praticar sem risco de morte
2. **Teste de Builds**: Permite testar diferentes combinações de atributos e feitiços
3. **Balanceamento**: Ajuda administradores a testar o balanceamento do jogo
4. **Diversão**: Adiciona uma mecânica de treino imersiva ao RPG

## Próximas Melhorias Sugeridas

1. **Sistema de Logs**: Registrar dano causado aos dummies
2. **Estatísticas**: Mostrar estatísticas de uso dos dummies
3. **Dummies Móveis**: Dummies que se movem ou têm padrões de ataque
4. **Recompensas de Treino**: XP reduzido por treinar com dummies
5. **Dummies Temáticos**: Dummies baseados em monstros específicos
6. **Interface Visual**: Embeds mais detalhados mostrando o estado dos dummies

## Troubleshooting

### Problemas Comuns:

1. **"Sistema de dummies indisponível"**
   - Verifique a conexão com MongoDB
   - Certifique-se de que as variáveis de ambiente estão configuradas

2. **"Dummy já existe"**
   - Use um nome diferente ou remova o dummy existente primeiro

3. **Comandos não aparecem**
   - Execute `node deploy-commands.js` para registrar os novos comandos
   - Verifique se o bot tem permissões adequadas no servidor

## Suporte

Para suporte técnico ou sugestões de melhorias, consulte a documentação principal do projeto ou entre em contato com a equipe de desenvolvimento.
