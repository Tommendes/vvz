const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL;
const supportMsgs = import.meta.env.VITE_SUPPORT_MSGS;

export const guide = `
    <p><strong>Guia do Usuário: Formulário de Composição</strong></p>
    <p>Bem-vindo ao formulário de composição! Aqui você pode criar e editar informações sobre as composições. Abaixo, explicamos os campos disponíveis e as opções oferecidas neste formulário:</p>

    <ol>
        <li>
            <p><strong>Detalhes da Composição:</strong></p>
            <ul>
                <li><strong>Número da Composição:</strong> Se você estiver editando uma composição existente, o número será exibido aqui. Caso contrário, será exibido como "Nova composição".</li>
                <li><strong>Composição Ativa:</strong> Utilize este interruptor para ativar ou desativar a composição. Uma composição inativa não é impressa.</li>
                <li><strong>Compõe Valor:</strong> Utilize este interruptor para definir se a composição compõe valor. Se não compuser valor, os valores serão apresentados como opções mas não serão totalizados junto com os demais itens.</li>
            </ul>
        </li>
        <li>
            <p><strong>Descrição Curta (60 caracteres):</strong></p>
            <ul>
                <li>Insira uma breve descrição da composição, com até 60 caracteres.</li>
            </ul>
        </li>
        <li>
            <p><strong>Descrição Longa (90 caracteres):</strong></p>
            <ul>
                <li>Insira uma descrição mais detalhada da composição, com até 90 caracteres.</li>
            </ul>
        </li>
    </ol>

    <p>Por favor, note que você pode clicar no botão "Editar" para fazer alterações nos dados da composição. Depois de fazer as alterações desejadas, clique em "Salvar". Se desejar cancelar as alterações, clique em "Cancelar".</p>
    <p>Esta página oferece um conjunto de recursos para criar e editar propostas de maneira eficiente.
        Certifique-se de usar as ações apropriadas de acordo com suas necessidades. Se tiver alguma dúvida, não hesite
        em entrar em contato com o suporte por <a href="mailto:${supportEmail}"><i class="fa-solid fa-at mr-1"></i>email</a> ou <a href="https://wa.me/${supportMsgs}" target="_blank"><i class="fa-brands fa-whatsapp mr-1"></i>mensagem</a>.</p>
`;

export default guide;
