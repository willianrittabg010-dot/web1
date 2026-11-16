const camposPorSecao = {
    projetos: [
        { chave: 'nome', titulo: 'Nome do projeto' },
        { chave: 'descricao', titulo: 'Descrição' },
        { chave: 'categoriaId', titulo: 'Categoria', lista: 'categorias' },
        { chave: 'tecnologiaId', titulo: 'Tecnologia principal', lista: 'tecnologias' }
    ],
    categorias: [{ chave: 'nome', titulo: 'Nome da categoria' }],
    tecnologias: [{ chave: 'nome', titulo: 'Nome da tecnologia' }]
};

const chaveDados = 'web1-catalogo-v1';
const botoes = document.querySelectorAll('[data-secao]');
const cadastro = document.querySelector('#cadastro');
const formulario = document.querySelector('#formulario');
const campos = document.querySelector('#campos');
const titulo = document.querySelector('#titulo-secao');
const salvar = document.querySelector('#salvar');
const cancelar = document.querySelector('#cancelar');
const mensagem = document.querySelector('#mensagem');
const colunas = document.querySelector('#colunas');
const registros = document.querySelector('#registros');

let dados;
let secao = 'projetos';
let idEmEdicao = null;

async function iniciar() {
    try {
        const dadosSalvos = localStorage.getItem(chaveDados);
        if (dadosSalvos === null) {
            const resposta = await fetch('dados.json');
            if (!resposta.ok) throw new Error('Arquivo de dados indisponível');
            dados = await resposta.json();
        } else {
            dados = JSON.parse(dadosSalvos);
        }
        if (!dados || !Object.keys(camposPorSecao).every(chave => Array.isArray(dados[chave]))) {
            throw new Error('Dados inválidos');
        }
    } catch {
        mensagem.textContent = location.protocol === 'file:'
            ? 'Abra o site no GitHub Pages ou por um servidor local para carregar os cadastros.'
            : 'Não foi possível ler os dados do catálogo neste navegador.';
        return;
    }

    botoes.forEach(botao => {
        botao.addEventListener('click', () => trocarSecao(botao.dataset.secao));
    });
    cadastro.hidden = false;
    trocarSecao(secao);
}

function trocarSecao(novaSecao) {
    secao = novaSecao;
    botoes.forEach(botao => {
        const ativo = botao.dataset.secao === secao;
        botao.classList.toggle('ativa', ativo);
        botao.setAttribute('aria-pressed', ativo);
    });
    mensagem.textContent = '';
    montarFormulario();
    mostrarRegistros();
}

function montarFormulario(registro = null) {
    idEmEdicao = registro ? registro.id : null;
    const editando = registro !== null;
    titulo.textContent = editando ? 'Editar cadastro' : 'Novo cadastro';
    salvar.textContent = editando ? 'Salvar alterações' : 'Cadastrar';
    cancelar.hidden = !editando;
    campos.replaceChildren();

    for (const campo of camposPorSecao[secao]) {
        const coluna = document.createElement('div');
        coluna.className = campo.lista ? 'col-12 col-sm-6' : 'col-12';
        const rotulo = document.createElement('label');
        rotulo.className = 'form-label';
        rotulo.htmlFor = campo.chave;
        rotulo.textContent = campo.titulo;

        let entrada;
        if (campo.lista) {
            entrada = document.createElement('select');
            entrada.className = 'form-select';
            entrada.add(new Option('Selecione', ''));
            for (const item of dados[campo.lista]) {
                entrada.add(new Option(item.nome, item.id));
            }
        } else {
            entrada = document.createElement(campo.chave === 'descricao' ? 'textarea' : 'input');
            entrada.className = 'form-control';
            entrada.maxLength = campo.chave === 'descricao' ? 500 : 100;
        }
        entrada.id = campo.chave;
        entrada.name = campo.chave;
        entrada.required = true;
        entrada.value = registro ? registro[campo.chave] : '';
        coluna.append(rotulo, entrada);
        campos.append(coluna);
    }

    const faltamCadastros = secao === 'projetos'
        && (dados.categorias.length === 0 || dados.tecnologias.length === 0);
    salvar.disabled = faltamCadastros;
    if (faltamCadastros) {
        mensagem.textContent = 'Cadastre pelo menos uma categoria e uma tecnologia para adicionar projetos.';
    }
}

function mostrarRegistros() {
    colunas.replaceChildren();
    registros.replaceChildren();
    const camposAtuais = camposPorSecao[secao];

    for (const texto of [...camposAtuais.map(campo => campo.titulo), 'Ações']) {
        const coluna = document.createElement('th');
        coluna.scope = 'col';
        coluna.textContent = texto;
        colunas.append(coluna);
    }

    if (dados[secao].length === 0) {
        const celula = registros.insertRow().insertCell();
        celula.colSpan = camposAtuais.length + 1;
        celula.textContent = 'Nenhum registro cadastrado.';
        return;
    }

    for (const registro of dados[secao]) {
        const linha = registros.insertRow();
        for (const campo of camposAtuais) {
            const valor = registro[campo.chave];
            linha.insertCell().textContent = campo.lista
                ? dados[campo.lista].find(item => item.id === valor)?.nome ?? 'Sem cadastro'
                : valor;
        }

        const acoes = linha.insertCell();
        const editar = document.createElement('button');
        editar.type = 'button';
        editar.className = 'btn btn-sm btn-outline-secondary me-1';
        editar.textContent = 'Editar';
        editar.addEventListener('click', () => {
            mensagem.textContent = '';
            montarFormulario(registro);
            formulario.elements.nome.focus();
        });

        const excluir = document.createElement('button');
        excluir.type = 'button';
        excluir.className = 'btn btn-sm btn-outline-danger';
        excluir.textContent = 'Excluir';
        excluir.addEventListener('click', () => excluirRegistro(registro));
        acoes.append(editar, excluir);
    }
}

function gravar(lista) {
    const dadosAtualizados = { ...dados, [secao]: lista };
    try {
        localStorage.setItem(chaveDados, JSON.stringify(dadosAtualizados));
    } catch {
        mensagem.textContent = 'Não foi possível salvar os dados neste navegador.';
        return false;
    }
    dados = dadosAtualizados;
    return true;
}

formulario.addEventListener('submit', evento => {
    evento.preventDefault();
    const lista = dados[secao];
    const registro = { id: idEmEdicao ?? Math.max(0, ...lista.map(item => item.id)) + 1 };
    for (const campo of camposPorSecao[secao]) {
        const entrada = formulario.elements[campo.chave];
        const valor = entrada.value.trim();
        if (valor === '') {
            mensagem.textContent = 'Preencha o campo ' + campo.titulo + '.';
            entrada.focus();
            return;
        }
        registro[campo.chave] = campo.lista ? Number(valor) : valor;
    }

    const editando = idEmEdicao !== null;
    const atualizada = editando
        ? lista.map(item => item.id === registro.id ? registro : item)
        : [...lista, registro];

    if (gravar(atualizada)) {
        mensagem.textContent = editando ? 'Alterações salvas.' : 'Cadastro criado.';
        montarFormulario();
        mostrarRegistros();
    }
});

cancelar.addEventListener('click', () => {
    mensagem.textContent = '';
    montarFormulario();
});

function excluirRegistro(registro) {
    const chaveProjeto = { categorias: 'categoriaId', tecnologias: 'tecnologiaId' }[secao];
    if (chaveProjeto && dados.projetos.some(projeto => projeto[chaveProjeto] === registro.id)) {
        mensagem.textContent = 'Este cadastro está em uso. Edite ou exclua os projetos vinculados primeiro.';
        return;
    }
    if (!confirm('Excluir "' + registro.nome + '"?')) return;

    if (gravar(dados[secao].filter(item => item.id !== registro.id))) {
        mensagem.textContent = 'Cadastro excluído.';
        if (idEmEdicao === registro.id) montarFormulario();
        mostrarRegistros();
    }
}

iniciar();
