import axios from 'axios';
export const getViaCep = async (cep) => {
    const url = `https://viacep.com.br/ws/${cep}/json/`;
    await axios.get(url).then((res) => {
        const body = res.data;
        if (body && body.cep) {
            return body;
        } else {
            return 'CEP não localizado. TEnte novamente ou preencha manualmente.';
        }
    });
};
export default { getViaCep };