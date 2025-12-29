/**
 * Gatilhos de Captura de Atenção
 *
 * Técnicas para capturar e manter atenção no WhatsApp
 * Baseado em psicologia de vendas e copywriting
 */

export const ATTENTION_HOOKS = {
    // ==================== ABERTURAS ====================
    openingHooks: {
        // Curiosidade instantânea
        curiosity: [
            "cara, acabei de ver uma coisa que me lembrou do seu negócio",
            "tava analisando uns números aqui e pensei em vc",
            "opa, preciso te contar uma parada rápida",
            "ei, descobri uma coisa interessante sobre [nicho do lead]",
            "mano, aconteceu uma coisa aqui que vc precisa saber"
        ],

        // Pattern interrupt (quebra padrão)
        patternInterrupt: [
            "posso te fazer uma pergunta estranha?",
            "isso vai parecer meio random mas...",
            "antes de vc responder qualquer coisa...",
            "espera, antes de falar de negócio...",
            "pergunta sincera:"
        ],

        // Prova social instantânea
        socialProof: [
            "ontem tava conversando com um cara do seu nicho e ele falou uma coisa...",
            "um cliente meu que faz a mesma coisa que vc...",
            "lembrei de vc pq fechei com um [profissão similar]...",
            "coincidência: outro [profissão] me procurou hoje"
        ],

        // Empatia genuína
        empathy: [
            "sei que deve tá corrido, mas rapidinho:",
            "sem enrolação pq sei que teu tempo vale:",
            "direto ao ponto pq imagino a correria:",
            "vou ser breve pq sei como é"
        ]
    },

    // ==================== PERGUNTAS QUE PRENDEM ====================
    engagingQuestions: {
        // Perguntas de diagnóstico (fazem o lead pensar)
        diagnostic: [
            "quanto tempo em média vc demora pra responder um lead novo?",
            "oq acontece quando um lead para de responder?",
            "vc consegue perceber quando um lead tá esfriando?",
            "quantos leads vc acha que perde por mês por falta de follow-up?",
            "como vc decide quando insistir e quando parar?",
            "qual a última vez que vc perdeu uma venda por demorar a responder?"
        ],

        // Perguntas de dor (amplificam o problema)
        painAmplification: [
            "e isso te incomoda ou vc já aceitou como normal?",
            "faz quantas vendas vc acha que deixou de fazer por isso?",
            "se fosse resolver isso, quanto valeria pra vc?",
            "quanto vc acha que tá deixando na mesa todo mês?",
            "já parou pra calcular o custo disso?"
        ],

        // Perguntas de futuro (criam visão)
        futureVision: [
            "se isso tivesse resolvido, oq mudaria no teu dia a dia?",
            "imagina acordar e ver que 3 leads que iam morrer foram reativados",
            "quanto vc pagaria pra nunca mais perder venda por silêncio?",
            "oq vc faria com o tempo que ganha automatizando isso?"
        ],

        // Perguntas de compromisso (micro-commitments)
        commitment: [
            "faz sentido conversar sobre isso?",
            "vc quer entender como funciona?",
            "posso te mostrar rapidinho?",
            "vale a pena explorar isso?",
            "te interessa resolver isso de vez?"
        ]
    },

    // ==================== GATILHOS MENTAIS ====================
    mentalTriggers: {
        // Escassez real (não fake)
        scarcity: [
            "to com a agenda quase lotada esse mês",
            "consigo encaixar mais um projeto essa semana",
            "tenho 2 vagas pra implementação até sexta",
            "normalmente levo 2 semanas pra começar, mas essa semana consigo"
        ],

        // Urgência baseada em dor
        painUrgency: [
            "enquanto a gente conversa, quantos leads tão esfriando?",
            "cada dia que passa são mais conversas morrendo",
            "o custo de não fazer nada é maior que o investimento",
            "oq vc perde esse mês não volta"
        ],

        // FOMO sutil
        fomo: [
            "a galera que implementou tá vendo resultado em dias",
            "ontem mesmo um cliente recuperou 3 vendas que iam morrer",
            "quem tá usando tá saindo na frente da concorrência",
            "enquanto vc pensa, outros tão implementando"
        ],

        // Reciprocidade (dá valor primeiro)
        reciprocity: [
            "deixa eu te passar um dado grátis:",
            "olha só esse insight que pode te ajudar:",
            "vou te contar uma coisa que aprendi:",
            "antes de falar de mim, deixa te ajudar com isso:"
        ],

        // Autoridade (sem arrogância)
        authority: [
            "depois de implementar em 50+ negócios...",
            "o que eu mais vejo acontecendo é...",
            "baseado nos dados que tenho aqui...",
            "a pesquisa mostra que..."
        ]
    },

    // ==================== TRANSIÇÕES ====================
    transitions: {
        // De curiosidade pra interesse
        curiosityToInterest: [
            "então é o seguinte...",
            "resumindo rapidinho:",
            "a parada é assim:",
            "olha só oq eu descobri:"
        ],

        // De interesse pra desejo
        interestToDesire: [
            "e o melhor é que...",
            "a diferença é que...",
            "imagina isso funcionando 24/7...",
            "agora imagina:"
        ],

        // De desejo pra ação
        desireToAction: [
            "quer ver funcionando?",
            "faz sentido pra vc?",
            "bora resolver isso?",
            "próximo passo:"
        ]
    },

    // ==================== RE-ENGAJAMENTO (follow-up) ====================
    reengagement: {
        // Quando sumiu por ocupação
        busy: [
            "e ai, conseguiu respirar?",
            "imagino a correria",
            "sem pressa, só passando pra ver se faz sentido ainda",
            "voltou do furacão? kk"
        ],

        // Quando parou no preço
        priceObjection: [
            "ei, esqueci de falar uma coisa sobre o investimento",
            "fiz uma conta rápida aqui...",
            "pensando melhor no que vc falou...",
            "lembrei de um ponto importante:"
        ],

        // Quando sumiu sem explicar
        ghosted: [
            "ei, sumiu? kk tudo bem?",
            "opa, tá vivo? rs",
            "imagino que tenha ficado corrido",
            "e ai, faz sentido ainda ou mudou algo?"
        ],

        // Quando disse "vou pensar"
        thinkingAbout: [
            "e ai, pensou?",
            "conseguiu refletir sobre aquilo?",
            "alguma dúvida que posso ajudar?",
            "oq tá faltando pra bater o martelo?"
        ],

        // Último follow-up (despedida elegante)
        lastChance: [
            "olha, vou parar de encher",
            "última mensagem, prometo kk",
            "beleza, respeito teu tempo",
            "se mudar de ideia, só chamar"
        ]
    },

    // ==================== ESTATÍSTICAS PARA USAR ====================
    stats: [
        "80% das vendas precisam de 5+ follow-ups",
        "44% dos vendedores desistem após 1 tentativa",
        "60% dos clientes dizem 'não' 4x antes de dizer 'sim'",
        "empresas que respondem em 5 min têm 100x mais chance de conversão",
        "leads não respondidos em 1h esfriam 7x mais",
        "follow-up aumenta respostas em até 220%",
        "melhor horário pra follow-up: 13h",
        "melhores dias: terça e quinta"
    ],

    // ==================== FRASES DE VALOR ====================
    valueStatements: [
        "uma venda perdida por mês já paga o investimento",
        "o que eu fiz foi ensinar o digital a ler comportamento humano",
        "não é sobre automação, é sobre ler comportamento",
        "enquanto seu concorrente demora 3h pra responder, vc responde em 3 min",
        "a conversa nunca morre, ela só muda de forma",
        "o custo de não fazer nada é maior que o investimento"
    ]
};

/**
 * Retorna um hook aleatório de uma categoria
 */
export function getRandomHook(category, subcategory) {
    const hooks = ATTENTION_HOOKS[category]?.[subcategory];
    if (!hooks || hooks.length === 0) return null;
    return hooks[Math.floor(Math.random() * hooks.length)];
}

/**
 * Retorna uma estatística aleatória
 */
export function getRandomStat() {
    const stats = ATTENTION_HOOKS.stats;
    return stats[Math.floor(Math.random() * stats.length)];
}

/**
 * Retorna um value statement aleatório
 */
export function getRandomValueStatement() {
    const statements = ATTENTION_HOOKS.valueStatements;
    return statements[Math.floor(Math.random() * statements.length)];
}

export default ATTENTION_HOOKS;
