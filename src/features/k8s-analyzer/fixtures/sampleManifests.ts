export const safeManifest = `apiVersion: v1
kind: Namespace
metadata:
  name: demo
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  namespace: demo
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
        - name: web
          image: ghcr.io/example/web:1.4.2
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 250m
              memory: 256Mi
`;

export const riskyManifest = `apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  name: public-api
  namespace: demo
spec:
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            backend:
              serviceName: api
              servicePort: 80
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: demo
spec:
  replicas: 1
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
        - name: api
          image: nginx:latest
          securityContext:
            privileged: true
      volumes:
        - name: docker-socket
          hostPath:
            path: /var/run/docker.sock
            type: Socket
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: deploy-bot-admin
subjects:
  - kind: ServiceAccount
    name: deploy-bot
    namespace: demo
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
`;

export type K8sManifestSampleKey = "safeManifest" | "riskyManifest";

export const sampleManifestMap: Record<K8sManifestSampleKey, string> = {
  safeManifest,
  riskyManifest,
};
