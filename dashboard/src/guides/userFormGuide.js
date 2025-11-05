const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL;
const supportMsgs = import.meta.env.VITE_SUPPORT_MSGS;

export const guide = `
    <p><strong>Página de Gerenciamento de Usuários</strong></p>
    <p>Esta página permite aos gestores visualizar, editar e salvar informações de usuários. Abaixo está uma descrição dos campos disponíveis e das opções fornecidas nesta página:</p>
    <ul>
    <li><strong>Dados Básicos:</strong>
        <ul>
        <li><strong>Nome:</strong> Campo para inserção do nome do usuário.</li>
        <li><strong>CPF/CNPJ:</strong> Campo para inserção do CPF ou CNPJ do usuário. O formato será automaticamente formatado conforme digitação.</li>
        <li><strong>E-mail:</strong> Campo para inserção do e-mail do usuário. Este campo só é editável durante a criação de um novo usuário.</li>
        </ul>
    </li>
    <li><strong>Permissões de Gestão / Alçadas:</strong>
        <ul>
        <li><strong>Gestor:</strong> Opção para definir se o usuário é um gestor ou não.</li>
        <li><strong>MultiCliente:</strong> Opção para definir se o usuário tem permissão multicliente.</li>
        <li><strong>Cadastros:</strong> Alçada para operações de cadastros.</li>
        <li><strong>Pipeline:</strong> Alçada para operações de pipeline.</li>
        <li><strong>Parâmetros do Pipeline:</strong> Alçada para operações de parâmetros do pipeline.</li>
        <li><strong>Pós-venda:</strong> Alçada para operações de pós-venda.</li>
        <li><strong>Assistência Técnica:</strong> Alçada para operações de assistência técnica.</li>
        <li><strong>Comercial:</strong> Alçada para operações comerciais.</li>
        <li><strong>Prospecções:</strong> Alçada para operações de prospecções.</li>
        <li><strong>Fiscal:</strong> Alçada para operações fiscais.</li>
        <li><strong>Financeiro:</strong> Alçada para operações financeiras.</li>
        <li><strong>Protocolo:</strong> Alçada para operações de protocolo.</li>
        <li><strong>Comissões:</strong> Alçada para operações de comissões.</li>
        <li><strong>Usuário Vendedor:</strong> Opção para definir se o usuário é um vendedor.</li>
        <li><strong>Usuário Arquiteto:</strong> Opção para definir se o usuário é um arquiteto.</li>
        <li><strong>Usuário de AT:</strong> Opção para definir se o usuário é um usuário de assistência técnica.</li>
        <li><strong>Schema Description:</strong> Descrição do esquema do usuário.</li>
        <li><strong>As alçadas possíveis são:</strong>
            <ul>
            <li><strong>Negado:</strong> O usuário não tem acesso a esses dados.</li>
            <li><strong>Pesquisa:</strong> O usuário pode pesquisar os registros.</li>
            <li><strong>Inclusão:</strong> O usuário pode incluir novos registros.</li>
            <li><strong>Edição:</strong> O usuário pode editar os dados.</li>
            <li><strong>Administração/Exclusão:</strong> O usuário pode administrar e excluir os registros.</li>
            </ul>
            </li>
        </ul>
    </li>
    <li><strong>Outras Funcionalidades:</strong>
        <ul>
        <li><strong>Trocar Senha:</strong> Botão para solicitar a troca de senha do usuário.</li>
        </ul>
    </li>
    </ul>
    <p>Além disso, dependendo do nível de acesso do usuário logado, certas informações e funcionalidades podem ser exibidas ou ocultas.</p>
    <p>Por favor, note que para editar as informações de um usuário, você deve clicar no botão "Editar". Depois de fazer as alterações desejadas, clique em "Salvar". Se desejar cancelar as alterações, clique em "Cancelar".</p>
    <p>Esta página oferece um conjunto de recursos para gerenciar registros de usuários de maneira eficiente.
        Certifique-se de usar as ações apropriadas de acordo com suas necessidades. Se tiver alguma dúvida, não hesite
        em entrar em contato com o suporte por <a href="mailto:${supportEmail}"><i class="fa-solid fa-at mr-1"></i>email</a> ou <a href="https://wa.me/${supportMsgs}" target="_blank"><i class="fa-brands fa-whatsapp mr-1"></i>mensagem</a>.</p>
`;

export default guide;
