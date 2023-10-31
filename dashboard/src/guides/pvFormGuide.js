import { userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);
import { supportEmail, supportMsgs } from '@/env';

export const guide = `
    <p>Nesta página você pode criar e editar registros de pós-vendas. Ela fornece acesso a várias funcionalidades para gerenciar esses registros. O formulário é composto por diferentes campos e recursos para auxiliar na entrada de dados, validação e interação com a API.</p>
    <p><strong>Funcionalidades Principais:</strong></p>
    <ul>
        <li><strong>Cliente:</strong> Você pode selecionar um cadastro associado ao registro. Se não houver cadastro
            registrado, você deve adicioná-lo. A criação do cadastro está disponível <i class="fa-solid fa-angles-right fa-fade"></i> <a href="/${userData.cliente}/${userData.dominio}/cadastros" class="font-bold">aqui</a> e depois clicando no botão <span class="text-xs p-button p-button-sm p-button-info p-button-outlined"><i class="pi pi-plus"></i> Novo Registro</span>.</li>
        <li><strong>Tipo do Pós-venda:</strong> Escolha o tipo de registro do pipeline a partir da lista.</li>
        <li><strong>Documento:</strong> Insira ou visualize o documento relacionado ao registro.</li>
        <li><strong>Descrição:</strong> Adicione informações detalhadas sobre o registro.</li>
    </ul>
    <p><strong>Ações Disponíveis:</strong></p>
    <ul>
        <li><strong>Editar:</strong> Se você estiver visualizando um registro, pode alternar para o modo de edição para
            fazer alterações.</li>
        <li><strong>Salvar:</strong> Salve as alterações feitas no registro.</li>
        <li><strong>Cancelar:</strong> Cancela qualquer alteração e retorna à visualização.</li>
        <li><strong>Novo Registro Idêntico:</strong> Crie um novo registro com base nas configurações atuais.</li>
        <li><strong>Criar OAT:</strong> Crie uma Ordem de Atendimento Técnico, se aplicável.</li>
        <li><strong>Liquidar Registro:</strong> Marque o registro como liquidado.</li>
        <li><strong>Cancelar Registro:</strong> Inutilize o registro, mantendo-o arquivado.</li>
        <li><strong>Reativar Registro:</strong> Reative o registro, se aplicável.</li>
        <li><strong>Excluir Registro:</strong> Remova permanentemente o registro. Essa ação é irreversível.</li>
    </ul>
    <p><strong>Andamento do Registro:</strong></p>
    <ul>
        <li>Visualize o histórico de andamento do registro com informações sobre status e datas.</li>
    </ul>
    <p>Esta página oferece um conjunto de recursos para gerenciar registros de pós-vendas de maneira eficiente.
        Certifique-se de usar as ações apropriadas de acordo com suas necessidades. Se tiver alguma dúvida, não hesite
        em entrar em contato com o suporte por <a href="mailto:${supportEmail}"><i class="fa-solid fa-at mr-1"></i>email</a> ou <a href="https://wa.me/${supportMsgs}" target="_blank"><i class="fa-brands fa-whatsapp mr-1"></i>mensagem</a>.</p>
`;

export default guide;
