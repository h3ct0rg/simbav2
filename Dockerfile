# Simba: El camino a casa — servidor estático con nginx
FROM nginx:1.27-alpine

# Configuración propia (redirige / → /game/, compresión y caché)
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/simba.conf

# Solo lo que el juego necesita: el juego y los sprites ya procesados.
# (raw/, scripts de Python y demás se excluyen en .dockerignore)
COPY game/    /usr/share/nginx/html/game/
COPY sprites/ /usr/share/nginx/html/sprites/

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/game/index.html || exit 1
