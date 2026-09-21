# Persistencia segura

Las lecturas de personajes, cuentas y guilds distinguen dos resultados: una consulta exitosa sin fila devuelve `null`; un error de Supabase o de transporte rechaza la promesa. Las escrituras y consultas de ranking también rechazan cuando Supabase no confirma la operación. El error conserva la causa original para el diagnóstico del servidor, pero los clientes reciben un mensaje general en español sin SQL, nombres de tablas, hosts ni detalles del proveedor.

El acceso carga la cuenta, el personaje y, cuando corresponde, su guild antes de crear `PlayerState`. Si alguna lectura o escritura de cuenta falla, la conexión se rechaza sin insertar estado jugable ni guardar progreso por defecto. Una guild inexistente después de una consulta exitosa conserva la reconstrucción compatible basada en los datos del personaje; una consulta fallida rechaza el acceso y no crea una guild vacía.

Los rankings conservan el último snapshot válido cuando su actualización falla. Las escrituras periódicas, al salir y al actualizar guilds ya registran los rechazos en sus puntos de control existentes.

Esta entrega no modifica tablas, columnas, IDs ni formatos guardados. La serialización de escrituras concurrentes, reintentos y colas de reconexión pertenece al trabajo posterior de ordenamiento y recuperación; no forma parte de esta garantía.
