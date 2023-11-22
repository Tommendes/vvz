import { createRouter, createWebHistory } from 'vue-router';
import AppLayout from '@/layout/AppLayout.vue';
import { userKey } from '../global';

const routes = [
    {
        path: '/',
        component: AppLayout,
        children: [
            {
                path: '/:client/:domain',
                name: 'dashboard',
                component: () => import('@/views/Dashboard.vue')
            },
            // Seção Clientes
            {
                path: '/:client/:domain/cadastros',
                name: 'cadastros',
                component: () => import('@/views/cadastros/CadastrosGrid.vue')
            },
            {
                path: '/:client/:domain/cadastro/:id',
                name: 'cadastro',
                component: () => import('@/views/cadastros/CadastroPanel.vue')
            },
            {
                path: '/:client/:domain/prospeccoes',
                name: 'prospeccoes',
                component: () => import('@/views/prospeccoes/ProspeccoesGrid.vue')
            },
            {
                path: '/:client/:domain/prospeccao/:id',
                name: 'prospeccao',
                component: () => import('@/views/prospeccoes/ProspeccaoForm.vue')
            },
            //Seção Comercial
            {
                path: '/:client/:domain/pipeline',
                name: 'pipeline',
                component: () => import('@/views/pipeline/PipelinesGrid.vue')
            },
            {
                path: '/:client/:domain/pipeline/:id',
                name: 'pipeline-one',
                component: () => import('@/views/pipeline/PipelineForm.vue')
            },
            {
                path: '/:client/:domain/protocolos',
                name: 'protocolos',
                component: () => import('@/views/protocolos/ProtocolosGrid.vue')
            },
            {
                path: '/:client/:domain/protocolo/:id',
                name: 'protocolo',
                component: () => import('@/views/protocolos/ProtocoloForm.vue')
            },
            // Seção Pós-Vendas
            {
                path: '/:client/:domain/pos-vendas',
                name: 'pos-vendas',
                component: () => import('@/views/pos-vendas/PosVendasGrid.vue')
            },
            {
                path: '/:client/:domain/pos-venda/:id',
                name: 'pos-venda',
                component: () => import('@/views/pos-vendas/PosVendaForm.vue')
            },
            {
                path: '/:client/:domain/tecnicos-pv',
                name: 'tecnicos-pv',
                component: () => import('@/views/tecnicos/TecnicosGrid.vue')
            },
            {
                path: '/:client/:domain/tecnico-pv/:id',
                name: 'tecnico-pv',
                component: () => import('@/views/tecnicos/TecnicoForm.vue')
            },
            // Seção Financeiro
            {
                path: '/:client/:domain/registros',
                name: 'registros',
                component: () => import('@/views/registros/RegistrosGrid.vue')
            },
            {
                path: '/:client/:domain/registro/:id',
                name: 'registro',
                component: () => import('@/views/registros/RegistroForm.vue')
            },
            {
                path: '/:client/:domain/comissoes',
                name: 'comissoes',
                component: () => import('@/views/comissoes/ComissoesGrid.vue')
            },
            {
                path: '/:client/:domain/comissao/:id',
                name: 'comissao',
                component: () => import('@/views/comissoes/ComissaoForm.vue')
            },
            {
                path: '/:client/:domain/retencoes',
                name: 'retencoes',
                component: () => import('@/views/retencoes/RetencoesGrid.vue')
            },
            {
                path: '/:client/:domain/retencao/:id',
                name: 'retencao',
                component: () => import('@/views/retencoes/RetencaoForm.vue')
            },
            // Seção Gestão
            {
                path: '/:client/:domain/empresa',
                name: 'empresa',
                component: () => import('@/views/empresa/EmpresasGrid.vue')
            },
            {
                path: '/:client/:domain/empresa/:id',
                name: 'empresa-one',
                component: () => import('@/views/empresa/EmpresaForm.vue')
            },
            {
                path: '/:client/:domain/pipeline-params',
                name: 'pipeline-params',
                component: () => import('@/views/pipeline_params/ParamsGrid.vue')
            },
            {
                path: '/:client/:domain/pipeline-param/:id',
                name: 'pipeline-param',
                component: () => import('@/views/pipeline_params/ParamForm.vue')
            },
            // Password
            {
                path: '/:client/:domain/password-reset',
                name: 'cli-password-reset',
                component: () => import('@/views/pages/auth/UserPassReset.vue')
            },
            // Upload de arquivos
            {
                path: '/:client/:domain/uploads',
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
    else if (user && user.id && (to.path == '/signin' || !to.path.startsWith(`/${user.cliente}/${user.dominio}`))) {
        next({ path: `/${user.cliente}/${user.dominio}/` });
    } else {
        if (!nameUnblockedRoutes.includes(to.name) && !(user && user.id)) next({ path: '/welcome' });
        else next();
    }
});

export default router;
