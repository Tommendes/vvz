import { supportEmail, supportMsgs } from '@/env';

export const guide = `
    <p>Esta página representa o formulário de Cadastro de Clientes e Fornecedores, onde você pode criar, visualizar e
        editar registros de clientes e fornecedores. Ela oferece acesso a diversas funcionalidades para gerenciar esses
        registros de maneira eficiente. O formulário inclui campos e recursos projetados para facilitar a entrada de
        dados, validação e interação com uma API externa.</p>
    <p><strong>Funcionalidades Principais:</strong></p>
    <ul>
        <li><strong>Seleção de Tipo de Registro:</strong> Escolha o tipo de registro de cliente ou fornecedor a partir
            de uma lista suspensa.</li>
        <li><strong>Campos de Identificação:</strong> Insira ou visualize informações como CPF/CNPJ, nome, RG/IE, sexo,
            data de aniversário e país de origem.</li>
        <li><strong>Área de Atuação:</strong> Selecione a área de atuação do cliente ou fornecedor a partir de uma lista
            de opções.</li>
        <li><strong>Detalhes de Contato:</strong> Forneça informações de contato, incluindo telefone e email.</li>
        <li><strong>INSS (Para comissionamento):</strong> Se aplicável, insira o número de INSS.</li>
        <li><strong>Outros Documentos:</strong> Registre informações adicionais sobre algum documento adicional(informe qual), se necessário.</li>
        <li><strong>Opção de Prospecto:</strong> Marque se o registro é um prospecto de cliente ou fornecedor.</li>
    </ul>
    <p><strong>Ações Disponíveis:</strong></p>
    <ul>
    <li><strong>Editar:</strong> Altere os detalhes do registro de cliente ou fornecedor, passando para o modo de
    edição.</li>
    <li><strong>Salvar:</strong> Salve as alterações feitas no registro.</li>
    <li><strong>Cancelar:</strong> Descarte as alterações e retorne à visualização.</li>
    <li><strong>Criar Novo Registro:</strong> Inicie o processo de criação de um novo registro vazio.</li>
    <li><strong>Converter para PJ (Pessoa Jurídica):</strong> Se necessário, converta o registro de cliente em um registro de pessoa jurídica alternando entre CPF e CNPJ no campo CPF/CNPJ.</li>
    </ul>
    <p><strong>Opções de dados Disponíveis:</strong></p>
    <ul>
        <li><i class="fa-solid fa-id-card mr-2"><strong></i>Dados básicos:</strong> Veja informações detalhadas do registro, caso esteja em modo de
            edição.</li>
        <li><i class="fa-solid fa-at mr-2"></i><strong>Contatos adicionais:</strong> Informe contatos extras como e-mails, telefones, páginas web, mídias sociais e etc.</li>
        <li><i class="fa-regular fa-map mr-2"></i><strong>Endereços:</strong> Utilize esta aba para informar quantos endereços forem necessários especificando, por exemplo, se eles são de faturamento, entrega, cobrança e etc.</li>
        <li><i class="fa-solid fa-paperclip mr-2"></i><strong>Pipeline:</strong> Nesta aba, tenha acesso a todo histórico comercial do cliente/fornecedor.</li>
        <li><i class="fa-solid fa-cart-plus mr-2"></i><strong>Pós-vendas:</strong> Todos os eventos de pós-vendas (suporte, montagens e mensagens aos agentes comerciais que atendem ao cliente/fornecedor) estão acessíveis aqui.</li>
        <li><i class="fa-regular fa-map mr-2"></i><strong>Prospecções e visitas ao cliente:</strong> Os agentes de vendas registram as visitas e esta aba contém esses dados que podem ser utilizados para, por exemplo acompanhar os trabalhos de prospecção.</li>
    </ul>
        <p>Esta página oferece um conjunto de recursos para gerenciar cadastros de maneira eficiente.
            Certifique-se de usar as ações apropriadas de acordo com suas necessidades. Se tiver alguma dúvida, não hesite
            em entrar em contato com o suporte por <a href="mailto:${supportEmail}"><i class="fa-solid fa-at mr-1"></i>email</a> ou <a href="https://wa.me/${supportMsgs}" target="_blank"><i class="fa-brands fa-whatsapp mr-1"></i>mensagem</a>.</p>
`;

export default guide;
