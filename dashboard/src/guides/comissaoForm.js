import { supportEmail, supportMsgs } from '@/env';

export const guide = `
    <p><strong>Formulário de Registro de Comissões</strong></p>
    <p>Esta página permite ao operador registrar informações relacionadas a comissões. Abaixo está uma descrição dos campos disponíveis e das opções fornecidas nesta página:</p>
    <ul>
        <li><strong>Agente/Representante Comissionado:</strong> Selecione o agente ou representante comissionado.</li>
        <li><strong>Valor da Comissão:</strong> Campo para inserção do valor da comissão.</li>
        <li><strong>Descontar:</strong> Campo para inserção do valor a ser descontado, se aplicável.</li>
        <li><strong>Liquidar em:</strong> Selecione a data de liquidação. Esta informação é opcional no momento do registro.</li>
        <li><strong>Observação:</strong> Campo para inserção de observações adicionais. Esta informação também é opcional</li>
    </ul>
    <p>Além disso, esta página oferece ações para editar, liquidar e excluir registros de comissões.</p>
    <p>Por favor, note que para realizar edições, clique no botão "Editar". Depois de fazer as alterações desejadas, clique em "Salvar". Se desejar cancelar as alterações, clique em "Cancelar".</p>
    <p>Caso necessite de suporte adicional, por favor entre em contato conosco através do email <a href="mailto:${supportEmail}"><i class="fa-solid fa-at mr-1"></i>${supportEmail}</a> ou via <a href="https://wa.me/${supportMsgs}" target="_blank"><i class="fa-brands fa-whatsapp mr-1"></i>WhatsApp</a>.</p>
`;

export default guide;
