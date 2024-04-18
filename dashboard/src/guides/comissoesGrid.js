import { supportEmail, supportMsgs } from '@/env';

export const guide = `
    <p><strong>Tabela de Comissões</strong></p>
    <p>Esta tabela exibe informações sobre comissões e oferece opções para adicionar, editar, excluir, liquidar em grupo e muito mais.</p>
    <p>Aqui está uma descrição dos elementos disponíveis:</p>
    <ul>
        <li><strong>Botão "Nova Comissão" <i class="fa-solid fa-plus"></i>:</strong> Clique neste botão para adicionar uma nova comissão.</li>
        <li><strong>Botão "Liquidação em grupo" <i class="fa-solid fa-file-invoice-dollar"></i>:</strong> Use este botão para liquidar todas as comissões pendentes deste pipeline.</li>
        <li><strong>Input "Agente":</strong> Mostra/Seleciona o nome do agente ou representante.</li>
        <li><strong>Input "Valor base":</strong> Informe o valor base da comissão.</li>
        <li><strong>Input "Percentual":</strong> Informe o percentual da comissão.</li>
        <li><strong>Input "Valor":</strong> Apresenta o valor da comissão calculado a partir do valor base x o percentual.</li>
        <li><strong>Input "Liquidação em":</strong> Indica a data de liquidação.</li>
        <li><strong>Input "Parcela":</strong> Selecione a parcela caso seja uma liquidação parcelada ou "Unica" caso não haja parcelamento.</li>
    </ul>
    <ol>Os botões abaixo podem variar de acordo com a situação da comissão e as permissões do usuário:
        <li><strong>Botão "Salvar registro" <i class="fa-solid fa-floppy-disk"></i></strong>: Salvar registro. Esta opção só está disponível nos modos "edição" e "novo" e se o usuário tiver permissão para adicionar ou editar uma "Comissões".</li>
        <li><strong>Botão "Editar" <i class="fa-regular fa-pen-to-square"></i></strong>: Clique para editar. Esta opção exige permissão para editar, só aparece quando o registro está no modo de visualização e enquanto a comissão não for encerrada.</li>
        <li><strong>Botão "Liquidar comissão" <i class="fa-regular fa-calendar-check"></i></strong>: Liquidar comissão. Esta opção só está disponível quando o registro está no modo de visualização, o status da comissão é anterior a "liquidado" e o usuário tem permissão para editar o "Financeiro" ou "Comissões".</li>
        <li><strong>Botão "Cancelar liquidação" <i class="fa-regular fa-calendar-xmark"></i></strong>: Cancelar liquidação. Esta opção só está disponível quando o registro está no modo de visualização, o status da comissão é "liquidado" e o usuário tem permissão para editar o "Financeiro" ou "Comissões".</li>
        <li><strong>Botão "Parcelar comissão" <i class="fa-solid fa-ellipsis-vertical"></i></strong>: Parcelar comissão. Esta opção só está disponível quando o status da comissão é "Criado", a parcela é "Unica", o registro está no modo de visualização e o usuário tem permissão para editar "Comissões".</li>
        <li><strong>Botão "Cancelar edição" <i class="fa-solid fa-ban"></i></strong>: Cancelar edição. Esta opção só está disponível nos modos "edição" e "novo".</li>
        <li><strong>Botão "Mostrar o timeline da comissão" <i class="fa-solid fa-timeline"></i></strong>: Mostrar o timeline da comissão.</li>
        <li><strong>Botão "Excluir registro" <i class="fa-solid fa-trash"></i></strong>: Excluir registro. Esta opção só está disponível quando o registro está no modo de visualização, o status da comissão é anterior a "Encerrado", e o usuário tem permissão para excluir "Comissões".</li>
    </ol>
    <p>Para qualquer assistência adicional, entre em contato conosco através do email <a href="mailto:${supportEmail}">${supportEmail}</a> ou via <a href="https://wa.me/${supportMsgs}" target="_blank">WhatsApp</a>.</p>`;
// <li><strong>Botão "Liquidar os pendentes":</strong> Este botão permite liquidar as comissões pendentes.</li>
