import { defineStore } from 'pinia';
import { userKey, glKey } from '@/global';
import interceptor from '@/axios-interceptor';
import axios from 'axios';
const baseApiAuthUrl = import.meta.env.VITE_BASE_API_AUTH_URL;
const baseApiUrl = import.meta.env.VITE_BASE_API_URL;

export const useUserStore = defineStore('users', {
    state: () => ({
        user: {
            id: null
        },
        profile: {},
        timeLogged: null,
        timeToLogOut: 1800, // 30 minutos
        inactivityTimer: null,
        isTokenValid: false,
        validation: {},
        geolocation: {
            latitude: null,
            longitude: null
        },
        errorMessage: null
    }),
    getters: {
        userStore(state) {
            return state.user;
        },
        userGeoLoc(state) {
            return state.geolocation;
        }
    },
    actions: {
        async registerUser(email, password) {
            const url = `${baseApiAuthUrl}/signin`;
            const urlIp = `${baseApiAuthUrl}/getIP`;
            let ip = await axios.get(urlIp);
            ip = ip.data.ip.split(',')[0];
            interceptor.interceptors.request.use((config) => {
                config.headers['x-ip-address'] = ip;
                return config;
            });
            await interceptor
                .post(url, { email, password })
                .then(async (res) => {
                    this.user = res.data;
                    if (this.user.id && this.user.isMatch) {
                        this.user.ip = ip;
                        interceptor.defaults.headers.common['Authorization'] = `bearer ${this.user.token}`;
                        localStorage.setItem(userKey, JSON.stringify({ ...res.data, ip: ip }));
                        this.profile = await this.getProfile(this.user);
                        if (this.profile.admin >= 2) {
                            console.log('validation (only for dev)*', this.validation);
                            console.log('profile (only for dev)*', this.profile);
                        }
                        this.startInactivityTimer();
                    } else {
                        delete interceptor.defaults.headers.common['Authorization'];
                        delete interceptor.defaults.headers.common['x-ip-address'];
                        delete interceptor.defaults.headers.common['x-geo-lt'];
                        delete interceptor.defaults.headers.common['x-geo-ln'];
                        localStorage.removeItem(userKey);
                    }
                    return this.user;
                })
                .catch((error) => {
                    return { data: error };
                });
        },
        startInactivityTimer() {
            this.clearInactivityTimer();

            // Atualiza o localStorage com o tempo da última atividade
            localStorage.setItem('__lastActivity', Math.floor(Date.now() / 1000));

            // Cria um intervalo para verificar o tempo de inatividade
            this.inactivityTimer = setInterval(() => {
                const __lastActivity = localStorage.getItem('__lastActivity');
                const currentTime = Math.floor(Date.now() / 1000);
                const timeDifference = currentTime - __lastActivity; // em segundos
                if (timeDifference >= this.timeToLogOut) {
                    this.logout();
                    clearInterval(this.inactivityTimer); // Limpa o intervalo após o logout
                    location.reload();
                }
            }, 1000); // Checa a cada segundo
        },
        clearInactivityTimer() {
            if (this.inactivityTimer) {
                clearTimeout(this.inactivityTimer);
                this.inactivityTimer = null;
            }
        },
        resetInactivityTimer() {
            // Atualiza a última atividade no localStorage
            localStorage.setItem('__lastActivity', Math.floor(Date.now() / 1000));
        },
        async findUser(cpf) {
            const url = `${baseApiAuthUrl}/signin`;
            try {
                const res = await interceptor.post(url, { cpf });
                this.user = res.data;
            } catch (error) {
                return error;
            }
        },
        async validateToken(userData) {
            const url = `${baseApiAuthUrl}/validateToken`;
            if (userData && userData.ip) userData.ipSignin = userData.ip;
            try {
                this.validation = await interceptor.post(url, userData);
                this.isTokenValid = this.validation.data;
                if (this.isTokenValid) {
                    this.user = userData;
                    interceptor.defaults.headers.common['Authorization'] = `bearer ${this.user.token}`;
                    this.getLocation();
                    this.startInactivityTimer();
                } else {
                    this.logout();
                }
            } catch (error) {
                console.log(error);
                return false;
            }
        },
        // async getProfile(token) {
        //     const json = localStorage.getItem(userKey);
        //     const userData = JSON.parse(json)
        //     const th = await axios.post(`${baseApiUrl}/gth`);
        //     this.user = decodeToken(token || this.user.token || userData.token, th.data);
        //     return this.user;
        // },
        async getProfile(token) {
            const json = localStorage.getItem(userKey);
            const userData = JSON.parse(json);
            // const th = await axios.post(`${baseApiUrl}/gth`);
            // const untokenized = await decodeToken(token || this.user.token || userData.token, th.data);
            const profile = await axios.post(`${baseApiUrl}/gprof`, { id: this.user.id || userData.id });
            this.user = profile.data;
            this.user.exp = userData.exp;
            this.user.schema_description = userData.schema_description;
            return this.user;
        },
        logout() {
            this.clearInactivityTimer();
            this.user = {};
            delete interceptor.defaults.headers.common['Authorization'];
            delete interceptor.defaults.headers.common['x-ip-address'];
            delete interceptor.defaults.headers.common['x-geo-lt'];
            delete interceptor.defaults.headers.common['x-geo-ln'];
            localStorage.removeItem(userKey);
        },
        getLocation() {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(this.showPosition, this.showError);
            } else {
                this.errorMessage = 'Geolocalização não suportada pelo navegador.';
            }
        },
        showPosition(position) {
            this.geolocation.latitude = position.coords.latitude;
            this.geolocation.longitude = position.coords.longitude;
            this.errorMessage = null;
            localStorage.setItem(glKey, JSON.stringify({ geolocation: this.geolocation }));
            interceptor.defaults.headers.common['x-geo-lt'] = this.geolocation.latitude;
            interceptor.defaults.headers.common['x-geo-ln'] = this.geolocation.longitude;
        },
        showError(error) {
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    this.errorMessage = 'Permissão negada pelo usuário.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    this.errorMessage = 'Informações de localização indisponíveis.';
                    break;
                case error.TIMEOUT:
                    this.errorMessage = 'Tempo limite expirado para obter a localização.';
                    break;
                case error.UNKNOWN_ERROR:
                    this.errorMessage = 'Erro desconhecido ao obter a localização.';
                    break;
            }
        },
        async fetchGeolocation(ip) {
            fetch(`ipinfo.io/${ip}?token=d72148b1c8d694`)
                // .then((response) => response.json())
                .then((data) => {
                    if (data.length > 0) {
                        const location = data.loc.split(',');
                        this.location = {
                            latitude: location[0],
                            longitude: location[1]
                        };
                    }
                })
                .catch((error) => {
                    console.error('Erro ao obter a geolocalização:', error);
                });
        }
    }
});
