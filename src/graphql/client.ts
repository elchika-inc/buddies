import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { SchemaLink } from '@apollo/client/link/schema';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { typeDefs } from './schema';
import { resolvers } from './resolvers';

// ローカル用のスキーマリンク（実際のサーバーがない場合）
const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

// Apollo Clientの設定
export const apolloClient = new ApolloClient({
  link: new SchemaLink({ schema }),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          animals: {
            // ページネーション対応のキャッシュ設定
            keyArgs: ['filter'],
            merge(existing = { animals: [], pagination: {} }, incoming) {
              return {
                animals: [...existing.animals, ...incoming.animals],
                pagination: incoming.pagination,
              };
            },
          },
          dogs: {
            keyArgs: false,
            merge(existing = { animals: [], pagination: {} }, incoming) {
              return {
                animals: [...existing.animals, ...incoming.animals],
                pagination: incoming.pagination,
              };
            },
          },
          cats: {
            keyArgs: false,
            merge(existing = { animals: [], pagination: {} }, incoming) {
              return {
                animals: [...existing.animals, ...incoming.animals],
                pagination: incoming.pagination,
              };
            },
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
    },
    query: {
      errorPolicy: 'all',
    },
  },
});

// 将来のHTTPリンク用の設定（GraphQLサーバーを使用する場合）
export const createHttpApolloClient = (uri: string) => {
  const httpLink = createHttpLink({
    uri,
  });

  return new ApolloClient({
    link: httpLink,
    cache: new InMemoryCache({
      typePolicies: {
        Query: {
          fields: {
            animals: {
              keyArgs: ['filter'],
              merge(existing = { animals: [], pagination: {} }, incoming) {
                return {
                  animals: [...existing.animals, ...incoming.animals],
                  pagination: incoming.pagination,
                };
              },
            },
          },
        },
      },
    }),
  });
};