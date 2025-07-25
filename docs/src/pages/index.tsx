import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import CodeExamples from '@site/src/components/CodeExamples';

import styles from './index.module.css';

function HomepageHeader() {
    const { siteConfig } = useDocusaurusContext();
    return (
        <header className={clsx('hero hero--primary', styles.heroBanner)}>
            <div className="container">
                <div className={styles.heroLogo}>
                    <img
                        src="/interface-forge/img/logo.png"
                        alt="Interface Forge Logo"
                    />
                </div>
                <Heading as="h1" className="hero__title">
                    {siteConfig.title}
                </Heading>
                <p className="hero__subtitle">{siteConfig.tagline}</p>
                <div className={styles.buttons}>
                    <Link
                        className="button button--secondary button--lg"
                        to="/docs"
                    >
                        Get Started
                    </Link>
                    <Link
                        className="button button--outline button--secondary button--lg"
                        to="https://github.com/Goldziher/interface-forge"
                    >
                        View on GitHub
                    </Link>
                </div>
            </div>
        </header>
    );
}

export default function Home(): JSX.Element {
    const { siteConfig } = useDocusaurusContext();
    return (
        <Layout
            title={`${siteConfig.title} - Type-Safe Mock Data Generation`}
            description="A TypeScript library for creating strongly typed mock data factories using Faker.js for test data generation"
        >
            <HomepageHeader />
            <main>
                <HomepageFeatures />
                <CodeExamples />
            </main>
        </Layout>
    );
}
