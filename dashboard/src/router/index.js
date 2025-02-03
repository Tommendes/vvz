import { createRouter, createWebHashHistory } from 'vue-router';
import AppLayout from '@/layout/AppLayout.vue';
import { userKey } from '@/global';

const routes = [
    {
        path: '/',
        name: 'home',
        component: AppLayout,
        children: [
            {
                path: '/:client',
                name: 'dashboard',
                component: () => import('@/views/Dashboard.vue')
            },
            // Azul Bot
            {
                path: '/:client/azul-bot',
                name: 'azul-bot',
                component: () => import('@/views/azulBot/AzulBot.vue')
            },
            // Seção Clientes
            {
                path: '/:client/cadastros',
                name: 'cadastros',
                component: () => import('@/views/cadastros/CadastrosGrid.vue')
            },
            {
                path: '/:client/cadastro/:id',
                name: 'cadastro',
                component: () => import('@/views/cadastros/CadastroPanel.vue')
            },
            {
                path: '/:client/prospeccoes',
                name: 'prospeccoes',
                component: () => import('@/views/prospeccoes/ProspeccoesGrid.vue')
            },
            {
                path: '/:client/prospeccao/:id',
                name: 'prospeccao',
                component: () => import('@/views/prospeccoes/ProspeccaoForm.vue')
            },
            //Seção Comercial
            {
                path: '/:client/pipeline',
                name: 'pipeline',
                component: () => import('@/views/pipeline/PipelinesGrid.vue')
            },
            {
                path: '/:client/pipeline/:id',
                name: 'pipeline-one',
                component: () => import('@/views/pipeline/PipelinePanel.vue')
            },
            {
                path: '/:client/propostas',
                name: 'propostas',
                component: () => import('@/views/comPropostas/PropostasGrid.vue')
            },
            {
                path: '/:client/proposta/:id',
                name: 'proposta',
                component: () => import('@/views/comPropostas/PropostaPanel.vue')
            },
            {
                path: '/:client/protocolos',
                name: 'protocolos',
                component: () => import('@/views/protocolos/ProtocolosGrid.vue')
            },
            {
                path: '/:client/protocolo/:id',
                name: 'protocolo',
                component: () => import('@/views/protocolos/ProtocoloForm.vue')
            },
            {
                path: '/:client/produtos',
                name: 'produtos',
                component: () => import('@/views/comProdutos/ProdutosGrid.vue')
            },
            {
                path: '/:client/produto/:id',
                name: 'produto',
                component: () => import('@/views/comProdutos/ProdutoForm.vue')
            },
            // Seção Pós-Vendas
            {
                path: '/:client/pos-vendas',
                name: 'pos-vendas',
                component: () => import('@/views/posVendas/PosVendasGrid.vue')
            },
            {
                path: '/:client/pos-venda/:id',
                name: 'pos-venda',
                component: () => import('@/views/posVendas/PosVendaForm.vue')
            },
            {
                path: '/:client/tecnicos-pv',
                name: 'tecnicos-pv',
                component: () => import('@/views/tecnicos/TecnicosGrid.vue')
            },
            {
                path: '/:client/tecnico-pv/:id',
                name: 'tecnico-pv',
                component: () => import('@/views/tecnicos/TecnicoForm.vue')
            },
            // Seção Fiscal
            {
                path: '/:client/notas-fiscais',
                name: 'notas-fiscais',
                component: () => import('@/views/fisNotas/FisNotasGrid.vue')
            },
            {
                path: '/:client/notas-fiscais/:id',
                name: 'nota-fiscal',
                component: () => import('@/views/fisNotas/FisNotasForm.vue')
            },
            // Seção Financeiro
            {
                path: '/:client/financeiro',
                name: 'financeiro',
                component: () => import('@/views/financeiro/FinanceiroGrid.vue')
            },
            {
                path: '/:client/financeiro/:id',
                name: 'financeiro-one',
                component: () => import('@/views/financeiro/FinanceiroForm.vue')
            },
            // Seção Comissionamento
            {
                path: '/:client/comiss-agentes',
                name: 'comiss-agentes',
                component: () => import('@/views/comissAgentes/AgentesGrid.vue')
            },
            {
                path: '/:client/comissoes',
                name: 'comissoes',
                component: () => import('@/views/comissoes/ComissoesPanel.vue')
            },
            {
                path: '/:client/comissoes-agente',
                name: 'comissoes-agente',
                component: () => import('@/views/comissoes/ComissoesPanelAgente.vue')
            },
            // Seção Gestão
            {
                path: '/:client/empresas',
                name: 'empresa',
                component: () => import('@/views/empresas/EmpresasGrid.vue')
            },
            {
                path: '/:client/empresas/:id',
                name: 'empresa-one',
                component: () => import('@/views/empresas/EmpresaForm.vue')
            },
            {
                path: '/:client/usuarios',
                name: 'usuarios',
                component: () => import('@/views/usuario/UsuariosGrid.vue')
            },
            {
                path: '/:client/usuario/:id',
                name: 'usuario',
                component: () => import('@/views/usuario/UsuarioForm.vue')
            },
            {
                path: '/:client/pipeline-params',
                name: 'pipeline-params',
                component: () => import('@/views/pipelineParams/ParamsGrid.vue')
            },
            {
                path: '/:client/pipeline-param/:id',
                name: 'pipeline-param',
                component: () => import('@/views/pipelineParams/ParamForm.vue')
            },
            {
                path: '/:client/eventos',
                name: 'eventos',
                component: () => import('@/views/events/EventsGrid.vue')
            },
            // Seção Suporte
            {
                path: '/:client/messages',
                name: 'messages',
                component: () => import('@/views/messages/MessagesGrid.vue')
            },
            {
                path: '/:client/message/:id',
                name: 'message',
                component: () => import('@/views/messages/MessageForm.vue')
            },
            // Password
            {
                path: '/:client/password-reset',
                name: 'cli-password-reset',
                component: () => import('@/views/pages/auth/UserPassReset.vue')
            },
            // Upload de arquivos
            {
                path: '/:client/uploads',
                name: 'uploads',
                component: () => import('@/components/Uploads.vue')
            },
            // iFrame CWT
            {
                path: '/:client/cwt',
                name: 'uploads',
                component: () => import('@/views/crm/Cwt.vue')
            }
        ]
    },
    {
        path: '/welcome',
        name: 'welcome',
        component: () => import('@/views/pages/Home.vue')
    },
    {
        path: '/signin',
        name: 'signin',
        component: () => import('@/views/pages/auth/Signin.vue')
    },
    {
        path: '/signup',
        name: 'signup',
        component: () => import('@/views/pages/auth/Signup.vue')
    },
    {
        path: '/password-reset',
        name: 'password-reset',
        component: () => import('@/views/pages/auth/UserPassReset.vue')
    },
    {
        path: '/request-password-reset',
        name: 'request-password-reset',
        component: () => import('@/views/pages/auth/UserRequestPassReset.vue')
    },
    {
        path: '/user-unlock/:id',
        name: 'user-unlock',
        component: () => import('@/views/pages/auth/UserToken.vue')
    }
];
const router = createRouter({
    history: createWebHashHistory(),
    routes: routes
});

router.beforeEach((to, from, next) => {
    const nameUnblockedRoutes = ['welcome', 'signin', 'signup', 'user-unlock', 'request-password-reset', 'password-reset'];
    const json = localStorage.getItem(userKey);
    const user = JSON.parse(json);
    const paths = [];
    routes.forEach((element) => {
        if (element.children)
            element.children.forEach((element) => {
                paths.push(element.path);
            });
        paths.push(element.path);
    });
    const matchSize = to.matched.length - 1;    
    if (matchSize < 0 || !paths.includes(to.matched[matchSize].path)) next({ path: '/' });
    else if (user && user.id && (to.path == '/signin' || !to.path.startsWith(`/${user.schema_description}`))) {
        if (['request-password-reset', 'password-reset'].includes(to.name)) next();
        else next({ path: `/${user.schema_description}` });
    } else {
        if (!nameUnblockedRoutes.includes(to.name) && !(user && user.id)) {
            next({ path: '/welcome' });
        } else next();
    }
});


export default router;
