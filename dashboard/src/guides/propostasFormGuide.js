const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL;
const supportMsgs = import.meta.env.VITE_SUPPORT_MSGS;

export const guide1 = `
    <p><strong>Guia do Usuário: Formulário de Proposta</strong></p>
    <p>Bem-vindo ao formulário de proposta! Aqui você pode inserir e editar informações relacionadas à sua proposta. Abaixo, explicamos os campos disponíveis e as opções oferecidas neste formulário:</p>

    <ol>
        <li>
            <p><strong>Informações de Contato:</strong></p>
            <ul>
                <li><strong>Contato:</strong> Insira o nome do contato.</li>
                <li><strong>Telefone:</strong> Insira o número de telefone do contato. O formato será automaticamente ajustado conforme você digita.</li>
                <li><strong>Email:</strong> Insira o endereço de e-mail do contato.</li>
            </ul>
        </li>
        <li>
            <p><strong>Detalhes da Proposta:</strong></p>
            <ul>
                <li><strong>Prazo de Entrega:</strong> Selecione o prazo de entrega desejado.</li>
                <li><strong>Forma de Pagamento:</strong> Selecione a forma de pagamento desejada.</li>
                <li><strong>Validade da Proposta:</strong> Selecione a validade da proposta.</li>
            </ul>
        </li>
        <li>
            <p><strong>Outras Informações:</strong></p>
            <ul>
                <li><strong>Desconto Total:</strong> Insira o desconto total, se aplicável.</li>
                <li><strong>Desconto Ativo:</strong> Selecione se há algum desconto ativo.</li>
            </ul>
        </li>
    </ol>

    <p>Por favor, note que você pode clicar no botão "Editar" para fazer alterações nos dados da proposta. Depois de fazer as alterações desejadas, clique em "Salvar". Se desejar cancelar as alterações, clique em "Cancelar".</p>
    <p>Esta página oferece um conjunto de recursos para criar e editar propostas de maneira eficiente.
        Certifique-se de usar as ações apropriadas de acordo com suas necessidades. Se tiver alguma dúvida, não hesite
        em entrar em contato com o suporte por <a href="mailto:${supportEmail}"><i class="fa-solid fa-at mr-1"></i>email</a> ou <a href="https://wa.me/${supportMsgs}" target="_blank"><i class="fa-brands fa-whatsapp mr-1"></i>mensagem</a>.</p>
`;

export const guide2 = `
    <p><strong>Guia do Usuário: Formulário de Proposta</strong></p>
    <p>Bem-vindo ao formulário de proposta! Aqui você pode inserir e editar informações relacionadas à sua proposta. Abaixo, explicamos os campos disponíveis e as opções oferecidas neste formulário:</p>

    <ol>        
        <li>
            <p><strong>Campos Adicionais (para propostas padrão):</strong></p>
            <ul>
                <li><strong>Saudação Inicial:</strong> Insira a saudação inicial da proposta.</li>
                <li><strong>Garantia:</strong> Insira informações sobre garantia, se aplicável.</li>
                <li><strong>Conclusão:</strong> Insira a conclusão da proposta.</li>
                <li><strong>Assinatura:</strong> Insira informações sobre a assinatura da proposta.</li>
                <li><strong>Observações Finais:</strong> Insira quaisquer observações finais sobre a proposta.</li>
            </ul>
        </li>   
        <li>
            <p><strong>Ações da tela:</strong></p>
            <ul>
                <li><strong>Imprimir Proposta:</strong> Utilizado para imprimir a sua proposta com o timbrado previamente selecionado.</li>
                <li><strong>Imprimir Resumo:</strong> Utilizado para imprimir um resumo dos itens da sua proposta com o timbrado previamente selecionado.</li>
            </ul>
        </li>
    </ol>

    <p>Por favor, note que você pode clicar no botão "Editar" para fazer alterações nos dados da proposta. Depois de fazer as alterações desejadas, clique em "Salvar". Se desejar cancelar as alterações, clique em "Cancelar".</p>
    <p>Esta página oferece um conjunto de recursos para criar e editar propostas de maneira eficiente.
        Certifique-se de usar as ações apropriadas de acordo com suas necessidades. Se tiver alguma dúvida, não hesite
        em entrar em contato com o suporte por <a href="mailto:${supportEmail}"><i class="fa-solid fa-at mr-1"></i>email</a> ou <a href="https://wa.me/${supportMsgs}" target="_blank"><i class="fa-brands fa-whatsapp mr-1"></i>mensagem</a>.</p>
`;

export default { guide1, guide2 };
