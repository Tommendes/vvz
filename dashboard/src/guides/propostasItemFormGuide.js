const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL;
const supportMsgs = import.meta.env.VITE_SUPPORT_MSGS;

export const guide = `
    <p><strong>Guia do Usuário: Formulário de Item</strong></p>
    <p>Bem-vindo ao formulário de itens! Aqui você pode criar e editar informações sobre os itens. Abaixo, explicamos os campos disponíveis e as opções oferecidas neste formulário:</p>

    <ol>
        <li>
            <p><strong>Detalhes do Item:</strong></p>
            <ul>
                <li><strong>Número do Item:</strong> Se você estiver editando um item existente, o número será exibido aqui. Caso contrário, será exibido como "Novo item".</li>
                <li><strong>Item Ativo:</strong> Utilize este interruptor para ativar ou desativar o item. Um item inativo não é impresso.</li>
                <li><strong>Compõe Valor:</strong> Utilize este interruptor para definir se o item compõe valor. Se não compuser valor, os valores serão apresentados como opções mas não serão totalizados junto com os demais itens.</li>
            </ul>
        </li>
        <li>
            <p><strong>Composição:</strong></p>
            <ul>
                <li>Selecione a composição à qual o item pertence. Isto é opcional.</li>
            </ul>
        </li>
        <li>
            <p><strong>Produto:</strong></p>
            <ul>
                <li>Insira o produto correspondente ao item. Você pode pesquisar e selecionar o produto desejado.</li>
            </ul>
        </li>
        <li>
            <p><strong>Quantidade:</strong></p>
            <ul>
                <li>Insira a quantidade do item.</li>
            </ul>
        </li>
        <li>
            <p><strong>Valor Unitário (Valor de venda do registro):</strong></p>
            <ul>
                <li>Insira o valor unitário do item. O valor de venda atual do produto é exibido para referência.</li>
            </ul>
        </li>
        <li>
            <p><strong>Desconto do Item:</strong></p>
            <ul>
                <li>Insira o desconto aplicado ao item.</li>
            </ul>
        </li>
        <li>
            <p><strong>Desconto Ativo:</strong></p>
            <ul>
                <li>Selecione o desconto ativo para o item.</li>
            </ul>
        </li>
        <li>
            <p><strong>Descrição:</strong></p>
            <ul>
                <li>Insira uma descrição detalhada do item.</li>
            </ul>
        </li>
    </ol>

    <p>Por favor, note que você pode clicar no botão "Editar" para fazer alterações nos dados do item. Depois de fazer as alterações desejadas, clique em "Salvar". Se desejar cancelar as alterações, clique em "Cancelar".</p>
    <p>Esta página oferece um conjunto de recursos para criar e editar propostas de maneira eficiente.
        Certifique-se de usar as ações apropriadas de acordo com suas necessidades. Se tiver alguma dúvida, não hesite
        em entrar em contato com o suporte por <a href="mailto:${supportEmail}"><i class="fa-solid fa-at mr-1"></i>email</a> ou <a href="https://wa.me/${supportMsgs}" target="_blank"><i class="fa-brands fa-whatsapp mr-1"></i>mensagem</a>.</p>
`;

export default guide;
