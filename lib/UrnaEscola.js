const alunos = {
    A001: false,
    A002: false,
    A003: false,
    A004: false,
    A005: false
};

const opcoes = {
    "1": "Lógica de Programação",
    "2": "POO (Java)",
    "3": "Programação Web",
    "4": "Sistemas Operacionais",
    "5": "Arquitetura e Manutenção",
    "6": "Noções de Robótica",
    "7": "Gestão do Tempo",
    "8": "HTML e CSS"
};

const chaveVotos = "urnaEscolar:alunosVotaram:2026";
const fimVotacao = new Date();
fimVotacao.setHours(9, 29, 0, 0);

function criarContagemVazia() {
    return Object.fromEntries(Object.keys(opcoes).map((numero) => [numero, 0]));
}

function carregarVotos() {
    const salvo = sessionStorage.getItem(chaveVotos);
    if (salvo === null) {
        return { alunos: [], contagem: criarContagemVazia() };
    }

    let dados;
    try {
        dados = JSON.parse(salvo);
    } catch (error) {
        console.error("Não foi possível interpretar os votos salvos.", error);
        throw new Error("Os votos salvos estão inválidos. Procure a equipe responsável.");
    }

    if (Array.isArray(dados)) {
        if (dados.some((codigo) => !Object.prototype.hasOwnProperty.call(alunos, codigo))) {
            throw new Error("A lista de alunos que já votaram está inválida.");
        }
        return { alunos: [...new Set(dados)], contagem: criarContagemVazia() };
    }

    if (
        !dados ||
        !Array.isArray(dados.alunos) ||
        !dados.contagem ||
        dados.alunos.some((codigo) => !Object.prototype.hasOwnProperty.call(alunos, codigo)) ||
        Object.keys(opcoes).some((numero) =>
            !Number.isInteger(dados.contagem[numero]) || dados.contagem[numero] < 0
        )
    ) {
        throw new Error("Os votos salvos estão inválidos. Procure a equipe responsável.");
    }

    return { alunos: [...new Set(dados.alunos)], contagem: dados.contagem };
}

const votos = carregarVotos();
const alunosQueVotaram = new Set(votos.alunos);
for (const codigo of alunosQueVotaram) {
    alunos[codigo] = true;
}

const formIdentificacao = document.getElementById("formIdentificacao");
const formVotacao = document.getElementById("formVotacao");
const campoCodigo = document.getElementById("codigoAluno");
const etapaIdentificacao = document.getElementById("etapaIdentificacao");
const etapaVotacao = document.getElementById("etapaVotacao");
const etapaConclusao = document.getElementById("etapaConclusao");
const etapaResultados = document.getElementById("etapaResultados");
const statusEleicao = document.getElementById("statusEleicao");
const mensagemIdentificacao = document.getElementById("mensagemIdentificacao");
const mensagemVotacao = document.getElementById("mensagemVotacao");
const confirmacaoVoto = document.getElementById("confirmacaoVoto");
let codigoEleitorAtual = null;
let encerrada = false;

function formatarHorario(data) {
    return data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function mostrarResultados() {
    etapaIdentificacao.hidden = true;
    etapaVotacao.hidden = true;
    etapaConclusao.hidden = true;
    etapaResultados.hidden = false;
    statusEleicao.textContent = "Votação encerrada.";

    const total = Object.values(votos.contagem).reduce((soma, quantidade) => soma + quantidade, 0);
    document.getElementById("totalVotos").textContent = `Total de votos contabilizados: ${total}`;

    const listaResultados = document.getElementById("listaResultados");
    listaResultados.replaceChildren();
    for (const [numero, nome] of Object.entries(opcoes)) {
        const item = document.createElement("li");
        item.textContent = `${numero} - ${nome}: ${votos.contagem[numero]} voto(s)`;
        listaResultados.append(item);
    }
}

function atualizarPrazo() {
    const restante = fimVotacao.getTime() - Date.now();
    if (restante <= 0) {
        if (!encerrada) {
            encerrada = true;
            clearInterval(temporizador);
            mostrarResultados();
        }
        return;
    }

    const minutos = Math.floor(restante / 60000);
    const segundos = Math.floor((restante % 60000) / 1000);
    statusEleicao.textContent = `Votação aberta até ${formatarHorario(fimVotacao)}. Tempo restante: ${minutos}:${String(segundos).padStart(2, "0")}.`;
}

function salvarVoto(opcaoSelecionada) {
    const contagemAtualizada = {
        ...votos.contagem,
        [opcaoSelecionada]: votos.contagem[opcaoSelecionada] + 1
    };
    const alunosAtualizados = [...alunosQueVotaram, codigoEleitorAtual];

    try {
        sessionStorage.setItem(chaveVotos, JSON.stringify({
            alunos: alunosAtualizados,
            contagem: contagemAtualizada
        }));
    } catch (error) {
        console.error("Não foi possível salvar o voto nesta sessão.", error);
        mensagemVotacao.textContent = "Não foi possível registrar seu voto. Tente novamente ou procure a equipe responsável.";
        return false;
    }

    votos.contagem = contagemAtualizada;
    alunosQueVotaram.add(codigoEleitorAtual);
    alunos[codigoEleitorAtual] = true;
    return true;
}

formIdentificacao.addEventListener("submit", function(event) {
    event.preventDefault();
    atualizarPrazo();
    if (encerrada) {
        return;
    }

    const codigo = campoCodigo.value.trim().toUpperCase();
    campoCodigo.value = codigo;

    if (!Object.prototype.hasOwnProperty.call(alunos, codigo)) {
        mensagemIdentificacao.textContent = "Código não encontrado. Confira o código fornecido pela equipe responsável.";
        campoCodigo.focus();
        return;
    }

    if (alunos[codigo]) {
        mensagemIdentificacao.textContent = "Este aluno já votou. Se precisar de ajuda, procure a equipe responsável.";
        campoCodigo.focus();
        return;
    }

    codigoEleitorAtual = codigo;
    mensagemIdentificacao.textContent = "";
    etapaIdentificacao.hidden = true;
    etapaVotacao.hidden = false;
    mensagemVotacao.textContent = "Identificação confirmada. Escolha sua opção.";
    formVotacao.querySelector('input[name="opcao"]').focus();
});

document.getElementById("voltarIdentificacao").addEventListener("click", function() {
    atualizarPrazo();
    if (encerrada) {
        return;
    }

    formVotacao.reset();
    etapaVotacao.hidden = true;
    etapaIdentificacao.hidden = false;
    mensagemIdentificacao.textContent = "Confira seu código ou continue quando estiver pronto.";
    mensagemVotacao.textContent = "";
    campoCodigo.focus();
});

formVotacao.addEventListener("submit", function(event) {
    event.preventDefault();
    atualizarPrazo();
    if (encerrada) {
        return;
    }

    const opcaoSelecionada = new FormData(formVotacao).get("opcao");
    if (!opcaoSelecionada || !Object.prototype.hasOwnProperty.call(opcoes, opcaoSelecionada)) {
        mensagemVotacao.textContent = "Selecione uma opção antes de confirmar seu voto.";
        return;
    }

    if (!salvarVoto(opcaoSelecionada)) {
        return;
    }

    confirmacaoVoto.textContent = "Seu voto foi registrado. Os resultados serão exibidos após o encerramento da votação.";
    etapaVotacao.hidden = true;
    etapaConclusao.hidden = false;
    document.getElementById("novoVoto").focus();
});

document.getElementById("novoVoto").addEventListener("click", function() {
    atualizarPrazo();
    if (encerrada) {
        return;
    }

    formIdentificacao.reset();
    formVotacao.reset();
    codigoEleitorAtual = null;
    mensagemIdentificacao.textContent = "";
    mensagemVotacao.textContent = "";
    confirmacaoVoto.textContent = "";
    etapaConclusao.hidden = true;
    etapaIdentificacao.hidden = false;
    campoCodigo.focus();
});

const temporizador = setInterval(atualizarPrazo, 1000);
atualizarPrazo();
document.addEventListener("visibilitychange", atualizarPrazo);
