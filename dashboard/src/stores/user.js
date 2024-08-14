import { defineStore } from 'pinia';
import { baseApiAuthUrl, baseApiUrl } from '@/env';
import { userKey, glKey, decodeToken } from '@/global';
import interceptor from '@/axios-interceptor';
import axios from 'axios';

export const useUserStore = defineStore('users', {
    state: () => ({
        user: {
            id: null
        },
        profile: {},
        timeLogged: null,
        timeToLogOut: 900,
        inactivityTimer: null,
        isTokenValid: false,
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
        },
    },
    actions: {
        async registerUser(email, password) {
            const url = `${baseApiAuthUrl}/signin`;
            const urlIp = `${baseApiAuthUrl}/getIp`;
            let ip = await axios.get(urlIp);
            ip = ip.data.ip.split(',')[0];
            interceptor.interceptors.request.use((config) => {
                config.headers['x-ip-address'] = ip;
                return config;
            });
            await interceptor
                .post(url, { email, password })
                .then(async(res) => {
                    this.user = res.data;
                    if (this.user.id && this.user.isMatch) {
                        this.user.ip = ip;
                        interceptor.defaults.headers.common['Authorization'] = `bearer ${this.user.token}`;
                        localStorage.setItem(userKey, JSON.stringify({ ...res.data, ip: ip }));
                        this.profile = await this.getProfile(this.user);
                        if (this.profile.admin >= 2) {
                            console.log('validation (only for dev)*', validation);
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
            this.clearInactivityTimer(); // Limpa o timer anterior, se houver
            this.timeLogged = Math.floor(Date.now() / 1000);
            this.inactivityTimer = setTimeout(() => {
                console.log('Inatividade detectada. Realizando logout...');                
                this.logout(); // Executa o logout após (timeToLogOut / 60) minutos de inatividade
                location.reload();
            }, this.timeToLogOut * 1000);
        },
        clearInactivityTimer() {
            if (this.inactivityTimer) {
                clearTimeout(this.inactivityTimer);
                this.inactivityTimer = null;
            }
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
                const validation = await interceptor.post(url, userData)
                this.isTokenValid = validation.data;
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
        async getProfile(token) {
            const json = localStorage.getItem(userKey);
            const userData = JSON.parse(json)
            const th = await axios.post(`${baseApiUrl}/gth`);
            this.user = decodeToken(token || this.user.token || userData.token, th.data);
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
