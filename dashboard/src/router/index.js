import { createRouter, createWebHistory } from 'vue-router';
import AppLayout from '@/layout/AppLayout.vue';
import { userKey } from '../global';

const routes = [
    {
        path: '/',
        component: AppLayout,
        children: [
            {
                path: '/:client',
                name: 'dashboard',
                component: () => import('@/views/Dashboard.vue')
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
                component: () => import('@/views/pipeline/PipelineForm.vue')
            },
            {
                path: '/:client/propostas',
                name: 'propostas',
                component: () => import('@/views/comPropostas/PropostasGrid.vue')
            },
            {
                path: '/:client/proposta/:id',
                name: 'proposta',
                component: () => import('@/views/comPropostas/PropostaForm.vue')
            },
            {
                path: '/:client/prop-composicoes/:id_com_propostas',
                name: 'prop-composicoes',
                component: () => import('@/views/comPropostas/composicoes/ComposicoesGrid.vue')
            },
            {
                path: '/:client/prop-composicao/:id_com_propostas/:id',
                name: 'prop-composicao',
                component: () => import('@/views/comPropostas/composicoes/ComposicaoForm.vue')
            },
            {
                path: '/:client/prop-itens/:id_com_propostas',
                name: 'prop-itens',
                component: () => import('@/views/comPropostas/itens/ItensGrid.vue')
            },
            {
                path: '/:client/prop-item/:id_com_propostas/:id',
                name: 'prop-item',
                component: () => import('@/views/comPropostas/itens/ItemForm.vue')
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
            // Seção Financeiro
            {
                path: '/:client/registros',
                name: 'registros',
                component: () => import('@/views/registros/RegistrosGrid.vue')
            },
            {
                path: '/:client/registro/:id',
                name: 'registro',
                component: () => import('@/views/registros/RegistroForm.vue')
            },
            {
                path: '/:client/comissoes',
                name: 'comissoes',
                component: () => import('@/views/comissoes/ComissoesGrid.vue')
            },
            {
                path: '/:client/comissao/:id',
                name: 'comissao',
                component: () => import('@/views/comissoes/ComissaoForm.vue')
            },
            {
                path: '/:client/retencoes',
                name: 'retencoes',
                component: () => import('@/views/retencoes/RetencoesGrid.vue')
            },
            {
                path: '/:client/retencao/:id',
                name: 'retencao',
                component: () => import('@/views/retencoes/RetencaoForm.vue')
            },
            // Seção Gestão
            {
                path: '/:client/empresa',
                name: 'empresa',
                component: () => import('@/views/empresa/EmpresasGrid.vue')
            },
            {
                path: '/:client/empresa/:id',
                name: 'empresa-one',
                component: () => import('@/views/empresa/EmpresaForm.vue')
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
            }
        ]
    },
    {
        path: '/welcome',
        name: 'welcome',
        component: () => import('@/views/pages/Home.vue')
    },
    {
        path: '/not-found',
        name: 'notfound',
        component: () => import('@/views/pages/NotFound.vue')
    },
    {
        path: '/signin',
        name: 'signin',
        component: () => import('@/views/pages/auth/SignIn.vue')
    },
    {
        path: '/signup',
        name: 'signup',
        component: () => import('@/views/pages/auth/SignUp.vue')
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
        path: '/u-token',
        name: 'u-token',
        component: () => import('@/views/pages/auth/UserToken.vue')
    }
];
const router = createRouter({
    history: createWebHistory(),
    routes: routes
});

router.beforeEach((to, from, next) => {
    const nameUnblockedRoutes = ['welcome', 'signin', 'signup', 'u-token', 'not-found', 'request-password-reset', 'password-reset'];
    const json = localStorage.getItem(userKey);
    const user = JSON.parse(json);
    const paths = [];
    routes.forEach((element) => {
        // console.log(element.path);
        if (element.children)
            element.children.forEach((element) => {
                paths.push(element.path);
            });
        paths.push(element.path);
    });
    const matchSize = to.matched.length - 1;
    if (matchSize < 0 || !paths.includes(to.matched[matchSize].path)) next({ path: '/not-found' });
    else if (user && user.id && (to.path == '/signin' || !to.path.startsWith(`/${user.cliente}`))) {
        next({ path: `/${user.cliente}` });
    } else {
        if (!nameUnblockedRoutes.includes(to.name) && !(user && user.id)) next({ path: '/welcome' });
        else next();
    }
});

export default router;
