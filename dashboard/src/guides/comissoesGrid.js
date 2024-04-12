import { supportEmail, supportMsgs } from '@/env';

export const guide = `
    <p><strong>Tabela de Comissões</strong></p>
    <p>Esta tabela exibe informações sobre comissões e oferece opções para adicionar, programar liquidação em grupo e liquidar comissões pendentes.</p>
    <p>Aqui está uma descrição dos elementos disponíveis:</p>
    <ul>
        <li><strong>Botão "Nova Comissão":</strong> Clique neste botão para adicionar uma nova comissão.</li>
        <li><strong>Botão "Programar liquidação em grupo":</strong> Use este botão para programar a liquidação em grupo das comissões.</li>
        <li><strong>Botão "Liquidar os pendentes":</strong> Este botão permite liquidar as comissões pendentes.</li>
        <li><strong>Coluna "Agente":</strong> Mostra o nome do agente ou representante.</li>
        <li><strong>Coluna "Valor base":</strong> Informe o valor base da comissão.</li>
        <li><strong>Coluna "Percentual":</strong> Informe o percentual da comissão.</li>
        <li><strong>Coluna "Valor":</strong> Apresenta o valor da comissão calculado a partir do valor base x o percentual.</li>
        <li><strong>Coluna "Liquidação em":</strong> Indica a data de liquidação prevista.</li>
        <li><strong>Coluna "Situação":</strong> Exibe o status da comissão (Não programado, Programado para liquidação e Liquidado.).</li>
    </ul>
    <p>Para editar uma comissão, clique no ícone <i class="fa-regular fa-pen-to-square"></i>.</p>
    <p>Para qualquer assistência adicional, entre em contato conosco através do email <a href="mailto:${supportEmail}">${supportEmail}</a> ou via <a href="https://wa.me/${supportMsgs}" target="_blank">WhatsApp</a>.</p>
`;
