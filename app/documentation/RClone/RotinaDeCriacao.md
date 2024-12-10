# Criar Subdomínio com o Cloudflare
    sync.vivazul.com.br
# Criar o diretório para os arquivos do site sync...
    sudo mkdir -p /home/vivazul-sync/htdocs/sync.vivazul.com.br
    sudo chown -R www-data:www-data /home/vivazul-sync
    sudo chmod -R 755 /home/vivazul-sync
# Criar o diretório para os logs
    sudo mkdir -p /home/vivazul-sync/logs/nginx
    sudo chown -R www-data:www-data /home/vivazul-sync/logs
    sudo chmod -R 755 /home/vivazul-sync/logs
# Criar o arquivo de configuração
    sudo nano /etc/nginx/sites-available/sync.vivazul.com.br
        Ver arquivo sync.vivazul.com.br.conf no diretório
# Verifique se não há erros na configuração do Nginx
    sudo nginx -t
# Reiniciar o Nginx
    sudo systemctl restart nginx
# Instalar certificado SSL
    sudo apt update
    sudo apt install certbot python3-certbot-nginx
    sudo certbot --nginx -d sync.vivazul.com.br -d 
    Intalar rclone
# Instalar e configurar o rclone
    cd ~/
    Fetch and unpack
        curl -O https://downloads.rclone.org/rclone-current-linux-amd64.zip
        unzip rclone-current-linux-amd64.zip
        cd rclone-*-linux-amd64
    Copy binary file
        sudo cp rclone /usr/bin/
        sudo chown root:root /usr/bin/rclone
        sudo chmod 755 /usr/bin/rclone
    Install manpage
        sudo mkdir -p /usr/local/share/man/man1
        sudo cp rclone.1 /usr/local/share/man/man1/
        sudo mandb
# configurar
    rclone config
    n
    gDrive
    19
    -enter
    -enter
    1
    -enter
    No
    Yes
    > acessar a url sync.vivazul.com.br
    > autorizar o google
    No
    Yes
    q