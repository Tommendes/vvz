import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';

import PrimeVue from 'primevue/config';
import AutoComplete from 'primevue/autocomplete';
import Accordion from 'primevue/accordion';
import AccordionTab from 'primevue/accordiontab';
import Avatar from 'primevue/avatar';
import AvatarGroup from 'primevue/avatargroup';
import Badge from 'primevue/badge';
import BadgeDirective from 'primevue/badgedirective';
import BlockUI from 'primevue/blockui';
import Button from 'primevue/button';
import Breadcrumb from 'primevue/breadcrumb';
import Calendar from 'primevue/calendar';
import Card from 'primevue/card';
import Chart from 'primevue/chart';
import CascadeSelect from 'primevue/cascadeselect';
import Carousel from 'primevue/carousel';
import Checkbox from 'primevue/checkbox';
import Chip from 'primevue/chip';
import Chips from 'primevue/chips';
import ColorPicker from 'primevue/colorpicker';
import Column from 'primevue/column';
import ColumnGroup from 'primevue/columngroup';
import ConfirmDialog from 'primevue/confirmdialog';
import ConfirmPopup from 'primevue/confirmpopup';
import ConfirmationService from 'primevue/confirmationservice';
import ContextMenu from 'primevue/contextmenu';
import DataTable from 'primevue/datatable';
import DataView from 'primevue/dataview';
import DataViewLayoutOptions from 'primevue/dataviewlayoutoptions';
import InputGroup from 'primevue/inputgroup';
import InputGroupAddon from 'primevue/inputgroupaddon';
import DeferredContent from 'primevue/deferredcontent';
import Dialog from 'primevue/dialog';
import DialogService from 'primevue/dialogservice';
import Divider from 'primevue/divider';
import Dock from 'primevue/dock';
import Dropdown from 'primevue/dropdown';
import DynamicDialog from 'primevue/dynamicdialog';
import Fieldset from 'primevue/fieldset';
import FileUpload from 'primevue/fileupload';
import Galleria from 'primevue/galleria';
import Image from 'primevue/image';
import InlineMessage from 'primevue/inlinemessage';
import Inplace from 'primevue/inplace';
import InputSwitch from 'primevue/inputswitch';
import InputText from 'primevue/inputtext';
import InputMask from 'primevue/inputmask';
import InputNumber from 'primevue/inputnumber';
import InputOtp from 'primevue/inputotp';
import Knob from 'primevue/knob';
import Listbox from 'primevue/listbox';
import MegaMenu from 'primevue/megamenu';
import Menu from 'primevue/menu';
import Menubar from 'primevue/menubar';
import Message from 'primevue/message';
import MultiSelect from 'primevue/multiselect';
import OrderList from 'primevue/orderlist';
import OrganizationChart from 'primevue/organizationchart';
import OverlayPanel from 'primevue/overlaypanel';
import Paginator from 'primevue/paginator';
import Panel from 'primevue/panel';
import PanelMenu from 'primevue/panelmenu';
import Password from 'primevue/password';
import PickList from 'primevue/picklist';
import ProgressBar from 'primevue/progressbar';
import ProgressSpinner from 'primevue/progressspinner';
import Rating from 'primevue/rating';
import RadioButton from 'primevue/radiobutton';
import Ripple from 'primevue/ripple';
import Row from 'primevue/row';
import SelectButton from 'primevue/selectbutton';
import ScrollPanel from 'primevue/scrollpanel';
import ScrollTop from 'primevue/scrolltop';
import Skeleton from 'primevue/skeleton';
import Slider from 'primevue/slider';
import Sidebar from 'primevue/sidebar';
import SpeedDial from 'primevue/speeddial';
import SplitButton from 'primevue/splitbutton';
import Splitter from 'primevue/splitter';
import SplitterPanel from 'primevue/splitterpanel';
import Steps from 'primevue/steps';
import StyleClass from 'primevue/styleclass';
import TabMenu from 'primevue/tabmenu';
import TieredMenu from 'primevue/tieredmenu';
import Textarea from 'primevue/textarea';
import Toast from 'primevue/toast';
import ToastService from 'primevue/toastservice';
import Toolbar from 'primevue/toolbar';
import TabView from 'primevue/tabview';
import TabPanel from 'primevue/tabpanel';
import Tag from 'primevue/tag';
import Terminal from 'primevue/terminal';
import Timeline from 'primevue/timeline';
import ToggleButton from 'primevue/togglebutton';
import Tooltip from 'primevue/tooltip';
import Tree from 'primevue/tree';
import TreeSelect from 'primevue/treeselect';
import TreeTable from 'primevue/treetable';
import TriStateCheckbox from 'primevue/tristatecheckbox';
import VirtualScroller from 'primevue/virtualscroller';
import Editor from 'primevue/editor';

import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';

import CodeHighlight from '@/components/CodeHighlight.vue';
import BlockViewer from '@/components/BlockViewer.vue';
import Geolocation from '@/components/Geolocation.vue';
import VueGoogleMaps from '@fawmi/vue-google-maps';

import { vMaska } from 'maska';
import FocusTrap from 'primevue/focustrap';

import '@/assets/app.css';
import '@/assets/styles.scss';

export const app = createApp(App);
export const global = app.global;

app.use(createPinia());
app.use(router);
app.use(PrimeVue, {
    ripple: true,
    inputStyle: 'filled',
    locale: {
        startsWith: 'Começa com',
        contains: 'Contém',
        notContains: 'Não contém',
        endsWith: 'Termina com',
        equals: 'Igual',
        notEquals: 'Diferente',
        noFilter: 'Sem filtro',
        filter: 'Filtro',
        lt: 'Menor que',
        lte: 'Menor que ou igual a',
        gt: 'Maior que',
        gte: 'Maior que ou igual a',
        dateIs: 'Data é',
        dateIsNot: 'Data não é',
        dateBefore: 'Date é anterior',
        dateAfter: 'Data é posterior',
        custom: 'Customizado',
        clear: 'Limpar',
        close: 'Fechar',
        apply: 'Aplicar',
        matchAll: 'Match All',
        matchAny: 'Match Any',
        addRule: 'Adicionar Regra',
        removeRule: 'Remover Regra',
        accept: 'Sim',
        reject: 'Não',
        choose: 'Escolha',
        upload: 'Upload',
        cancel: 'Cancelar',
        completed: 'Concluído',
        pending: 'Pendente',
        fileSizeTypes: ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"],
        dayNames: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
        dayNamesShort: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
        dayNamesMin: ['Do', 'Se', 'Te', 'Qa', 'Qi', 'Sx', 'Sa'],
        monthNames: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
        monthNamesShort: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
        chooseYear: 'Escolha Ano',
        chooseMonth: 'Escolha Mês',
        chooseDate: 'Escolha Data',
        prevDecade: 'Década Anterior',
        nextDecade: 'Década Seguinte',
        prevYear: 'Ano Anterior',
        nextYear: 'Ano Seguinte',
        prevMonth: 'Mês Anterior',
        nextMonth: 'Mês Seguinte',
        prevHour: 'Hora Anterior',
        nextHour: 'Hora Seguinte',
        prevMinute: 'Minuto Anterior',
        nextMinute: 'Minuto Seguinte',
        prevSecond: 'Segundo Anterior',
        nextSecond: 'Segundo Seguinte',
        am: 'am',
        pm: 'pm',
        today: 'Hoje',
        weekHeader: 'Sem',
        firstDayOfWeek: 0,
        dateFormat: 'dd/mm/yy',
        weak: 'Fraco',
        medium: 'Médio',
        strong: 'Forte',
        passwordPrompt: 'Digite uma senha',
        emptyFilterMessage: 'Nenhum resultado encontrado',
        searchMessage: '{0} resultados disponíveis',
        selectionMessage: '{0} itens selecionados',
        emptySelectionMessage: 'Nenhum item selecionado',
        emptySearchMessage: 'Nenhum resultado encontrado',
        emptyMessage: 'Nenhuma opção disponível',
        aria: {
            trueLabel: 'Verdadeiro',
            falseLabel: 'Falso',
            nullLabel: 'Não selecionado',
            star: '1 estrela',
            stars: '{star} estrelas',
            selectAll: 'Todos itens selecionados',
            unselectAll: 'Nenhum item selecionado',
            close: 'Fechar',
            previous: 'Anterior',
            next: 'Seguinte',
            navigation: 'Navegação',
            scrollTop: 'Rolar para Topo',
            moveTop: 'Mover para Topo',
            moveUp: 'Mover para Cima',
            moveDown: 'Mover para Baixo',
            moveBottom: 'Mover para Final',
            moveToTarget: 'Mover para Alvo',
            moveToSource: 'Mover para Fonte',
            moveAllToTarget: 'Mover Todos para Alvo',
            moveAllToSource: 'Mover Todos para Fonte',
            pageLabel: '{page}',
            firstPageLabel: 'Primeira Página',
            lastPageLabel: 'Última Página',
            nextPageLabel: 'Página Seguinte',
            previousPageLabel: 'Página Anterior',
            rowsPerPageLabel: 'Linhas por página',
            jumpToPageDropdownLabel: 'Pular para Menu da Página',
            jumpToPageInputLabel: 'Pular para Campo da Página',
            selectRow: 'Linha Selecionada',
            unselectRow: 'Linha Não Selecionada',
            expandRow: 'Linha Expandida',
            collapseRow: 'Linha Recolhida',
            showFilterMenu: 'Mostrar Menu de Filtro',
            hideFilterMenu: 'Esconder Menu de Filtro',
            filterOperator: 'Operador de Filtro',
            filterConstraint: 'Restrição de Filtro',
            editRow: 'Editar Linha',
            saveEdit: 'Salvar Editar',
            cancelEdit: 'Cancelar Editar',
            listView: 'Exibição em Lista',
            gridView: 'Exibição em Grade',
            slide: 'Deslizar',
            slideNumber: '{slideNumber}',
            zoomImage: 'Ampliar Imagem',
            zoomIn: 'Mais Zoom',
            zoomOut: 'Menos Zoom',
            rotateRight: 'Girar à Direita',
            rotateLeft: 'Girar à Esquerda'
        }
    }
});

//in main.js
import 'primevue/resources/themes/md-light-deeppurple/theme.css';

app.use(ToastService);
app.use(DialogService);
app.use(ConfirmationService);
app.use(VueGoogleMaps, {
    load: {
        key: 'AIzaSyBj82tRHU6HYF9zR-AOKOknCBVlZ4kVlMI'
    },
    autobindAllEvents: true
});

app.directive('tooltip', Tooltip);
app.directive('badge', BadgeDirective);
app.directive('ripple', Ripple);
app.directive('styleclass', StyleClass);
app.directive('maska', vMaska);
app.directive('focustrap', FocusTrap);

app.component('CodeHighlight', CodeHighlight);
app.component('BlockViewer', BlockViewer);
app.component('Geolocation', Geolocation);

app.component('Accordion', Accordion);
app.component('AccordionTab', AccordionTab);
app.component('AutoComplete', AutoComplete);
app.component('Avatar', Avatar);
app.component('AvatarGroup', AvatarGroup);
app.component('Badge', Badge);
app.component('BlockUI', BlockUI);
app.component('Breadcrumb', Breadcrumb);
app.component('Button', Button);
app.component('Calendar', Calendar);
app.component('Card', Card);
app.component('Chart', Chart);
app.component('Carousel', Carousel);
app.component('CascadeSelect', CascadeSelect);
app.component('Checkbox', Checkbox);
app.component('Chip', Chip);
app.component('Chips', Chips);
app.component('ColorPicker', ColorPicker);
app.component('Column', Column);
app.component('ColumnGroup', ColumnGroup);
app.component('ConfirmDialog', ConfirmDialog);
app.component('ConfirmPopup', ConfirmPopup);
app.component('ContextMenu', ContextMenu);
app.component('DataTable', DataTable);
app.component('DataView', DataView);
app.component('DataViewLayoutOptions', DataViewLayoutOptions);
app.component('InputGroup', InputGroup);
app.component('InputGroupAddon', InputGroupAddon);
app.component('DeferredContent', DeferredContent);
app.component('Dialog', Dialog);
app.component('Divider', Divider);
app.component('Dock', Dock);
app.component('Dropdown', Dropdown);
app.component('DynamicDialog', DynamicDialog);
app.component('Fieldset', Fieldset);
app.component('FileUpload', FileUpload);
app.component('Galleria', Galleria);
app.component('Image', Image);
app.component('InlineMessage', InlineMessage);
app.component('Inplace', Inplace);
app.component('InputMask', InputMask);
app.component('InputNumber', InputNumber);
app.component('InputOtp', InputOtp);
app.component('InputSwitch', InputSwitch);
app.component('InputText', InputText);
app.component('Knob', Knob);
app.component('Listbox', Listbox);
app.component('MegaMenu', MegaMenu);
app.component('Menu', Menu);
app.component('Menubar', Menubar);
app.component('Message', Message);
app.component('MultiSelect', MultiSelect);
app.component('OrderList', OrderList);
app.component('OrganizationChart', OrganizationChart);
app.component('OverlayPanel', OverlayPanel);
app.component('Paginator', Paginator);
app.component('Panel', Panel);
app.component('PanelMenu', PanelMenu);
app.component('Password', Password);
app.component('PickList', PickList);
app.component('ProgressBar', ProgressBar);
app.component('ProgressSpinner', ProgressSpinner);
app.component('RadioButton', RadioButton);
app.component('Rating', Rating);
app.component('Row', Row);
app.component('SelectButton', SelectButton);
app.component('ScrollPanel', ScrollPanel);
app.component('ScrollTop', ScrollTop);
app.component('Slider', Slider);
app.component('Sidebar', Sidebar);
app.component('Skeleton', Skeleton);
app.component('SpeedDial', SpeedDial);
app.component('SplitButton', SplitButton);
app.component('Splitter', Splitter);
app.component('SplitterPanel', SplitterPanel);
app.component('Steps', Steps);
app.component('TabMenu', TabMenu);
app.component('TabView', TabView);
app.component('TabPanel', TabPanel);
app.component('Tag', Tag);
app.component('Textarea', Textarea);
app.component('Terminal', Terminal);
app.component('TieredMenu', TieredMenu);
app.component('Timeline', Timeline);
app.component('Toast', Toast);
app.component('Toolbar', Toolbar);
app.component('ToggleButton', ToggleButton);
app.component('Tree', Tree);
app.component('TreeSelect', TreeSelect);
app.component('TreeTable', TreeTable);
app.component('TriStateCheckbox', TriStateCheckbox);
app.component('VirtualScroller', VirtualScroller);
app.component('Editor', Editor);
app.component('IconField', IconField);
app.component('InputIcon', InputIcon);

app.mount('#app');
